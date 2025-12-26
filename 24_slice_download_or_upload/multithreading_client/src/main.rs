use anyhow::{Context, Result};
use clap::Parser;
use futures::stream::StreamExt;
use indicatif::{MultiProgress, ProgressBar, ProgressStyle};
use std::fs::{File, OpenOptions};
use std::io::{Seek, SeekFrom, Write};
use std::path::Path;
use std::sync::Arc;
use std::time::Instant;
use tokio::task;

const API_BASE_URL: &str = "http://127.0.0.1:3210/api";
const CHUNK_SIZE: usize = 25 * 1024 * 1024;
const NUM_THREADS: usize = 100;
const DEFAULT_FILE_HASH: &str = "bf2aa78acb8a685cc2e526988bb02deac7dab0a67988c609bdd55d87b7408fc0";

#[derive(Parser)]
#[command(name = "file-downloader")]
#[command(about = "A multithreaded file downloader")]
struct Args {
    /// File hash to download
    #[arg(long = "file-hash", default_value = DEFAULT_FILE_HASH)]
    file_hash: String,
}

#[tokio::main]
async fn main() -> Result<()> {
    println!("Multithreaded File Downloader");

    // 解析命令行参数
    let args = Args::parse();
    let file_hash = &args.file_hash;

    println!("Target file hash: {}", file_hash);

    // 创建HTTP客户端
    let client = reqwest::Client::new();

    // 首先发送HEAD请求以获取文件大小
    let file_url = format!("{}/upload/download/{}", API_BASE_URL, file_hash);
    println!("Fetching file information from {file_url}...");

    let resp = client
        .head(&file_url)
        .header("Range", "bytes=0-0") // 只请求第一个字节来获取文件大小
        .send()
        .await?;

    if !resp.status().is_success() {
        return Err(anyhow::anyhow!(
            "Failed to get file info: HTTP status {}",
            resp.status()
        ));
    }

    // 从Content-Range头解析文件大小: bytes 0-0/fileSize
    let content_range = resp
        .headers()
        .get("content-range")
        .context("Missing Content-Range header")?
        .to_str()?;

    println!("Content Range {}", content_range);

    let file_size = content_range
        .split('/')
        .last()
        .context("Invalid Content-Range header")?
        .parse::<usize>()?;

    println!("File size: {} bytes", file_size);

    let content_disposition = resp
        .headers()
        .get("Content-Disposition")
        .context("Missing Content-Disposition header")?
        .to_str()?;

    println!("Content Disposition {}", content_disposition);

    let file_name = content_disposition
        .split("filename=")
        .last()
        .context("Invalid Content-Disposition header")?
        .to_string();

    println!("File name {}", file_name);

    let output_file = Arc::new(file_name);

    let path_prefix = Path::new("resources/");

    let output_path = path_prefix.join(Path::new(output_file.as_str()));

    println!("Output file: {}", output_path.display());

    // 创建输出文件
    let file = File::create(&output_path)?;
    // 预分配文件大小
    file.set_len(file_size as u64)?;

    // 计算分块数量
    let num_chunks = (file_size + CHUNK_SIZE - 1) / CHUNK_SIZE;
    println!(
        "Downloading in {} chunks with {} threads",
        num_chunks, NUM_THREADS
    );

    // 创建进度条
    let multi_progress = MultiProgress::new();
    let progress_style = ProgressStyle::default_bar()
        .template("{msg} [{bar:40.cyan/blue}] {bytes}/{total_bytes} ({eta})")
        .unwrap()
        .progress_chars("#>-");

    // 创建总进度条
    let total_progress = multi_progress.add(ProgressBar::new(file_size as u64));
    total_progress.set_style(progress_style.clone());
    total_progress.set_message("Total progress");

    // 记录开始时间
    let start_time = Instant::now();

    // 使用信号量限制并发数量
    let semaphore = Arc::new(tokio::sync::Semaphore::new(NUM_THREADS));

    // 共享客户端
    let client = Arc::new(client);
    // 共享进度条
    let total_progress = Arc::new(total_progress);

    // 创建任务列表
    let mut tasks = vec![];

    // 为每个分块创建下载任务
    for chunk_index in 0..num_chunks {
        let start = chunk_index * CHUNK_SIZE;
        let end = std::cmp::min(start + CHUNK_SIZE - 1, file_size - 1);
        let chunk_size = end - start + 1;

        // 创建分块进度条
        let chunk_progress = multi_progress.add(ProgressBar::new(chunk_size as u64));
        chunk_progress.set_style(progress_style.clone());
        chunk_progress.set_message(format!("Chunk {}", chunk_index));

        // 克隆引用
        let client = client.clone();
        let file_url = file_url.clone();
        let total_progress = total_progress.clone();
        let permit = semaphore.clone();
        let output_file = output_file.clone();

        // 创建下载任务
        let task = task::spawn(async move {
            // 获取信号量许可
            let _permit = permit.acquire().await.unwrap();
            let result = download_chunk(
                &client,
                &file_url,
                start,
                end,
                output_file.as_str(),
                Some(chunk_progress),
                total_progress.clone(),
            )
            .await;

            if let Err(e) = &result {
                eprintln!("Error downloading chunk {}: {}", chunk_index, e);
            }

            result
        });

        tasks.push(task);
    }

    // 等待所有任务完成
    let mut success = true;
    for task in tasks {
        if let Err(e) = task.await? {
            eprintln!("Task error: {}", e);
            success = false;
        }
    }

    // 完成下载
    total_progress.finish_with_message(if success {
        "Download completed successfully"
    } else {
        "Download completed with errors"
    });

    // 计算并显示总用时和平均速度
    let duration = start_time.elapsed();
    let speed = file_size as f64 / duration.as_secs_f64() / 1024.0 / 1024.0;

    println!("\nDownload statistics:");
    println!("Total time: {:.2?}", duration);
    println!("Average speed: {:.2} MB/s", speed);

    if success {
        println!("File downloaded successfully: {}", output_path.display());
    } else {
        println!("Download completed with errors. File may be incomplete.");
    }

    Ok(())
}

// 下载单个文件块
async fn download_chunk(
    client: &reqwest::Client,
    url: &str,
    start: usize,
    end: usize,
    output_file: &str,
    progress: Option<ProgressBar>,
    total_progress: Arc<ProgressBar>,
) -> Result<()> {
    let range = format!("bytes={}-{}", start, end);

    let response = client.get(url).header("Range", range).send().await?;

    if !response.status().is_success() && response.status() != reqwest::StatusCode::PARTIAL_CONTENT
    {
        return Err(anyhow::anyhow!(
            "Failed to download chunk: HTTP status {}",
            response.status()
        ));
    }

    // 打开文件准备写入
    let path_prefix = Path::new("resources/");
    let mut file = OpenOptions::new()
        .write(true)
        .open(path_prefix.join(output_file))?;

    // 移动到对应位置
    file.seek(SeekFrom::Start(start as u64))?;

    // 从响应流读取数据
    let mut stream = response.bytes_stream();

    while let Some(item) = stream.next().await {
        let chunk = item?;
        file.write_all(&chunk)?;

        if let Some(ref p) = progress {
            p.inc(chunk.len() as u64);
        }
        total_progress.inc(chunk.len() as u64);
    }

    // 完成进度条
    if let Some(p) = progress {
        p.finish_with_message(format!("Chunk {}-{} completed", start, end));
    }

    Ok(())
}
