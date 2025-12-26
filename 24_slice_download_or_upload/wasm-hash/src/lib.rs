mod utils;

use blake3;
use md5::{Digest, Md5};
use wasm_bindgen::prelude::*;

// 当 panic 发生时打印错误信息
#[wasm_bindgen]
extern "C" {
    // 使用 `js_namespace` 属性让这个 `fn` 调用 JavaScript 的 `console.log` 函数
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

#[wasm_bindgen]
pub struct HashCalculator {
    blake3_hasher: blake3::Hasher,
    md5_hasher: Md5,
    hash_type: String, // 新增: "blake3" 或 "md5"
}

#[wasm_bindgen]
impl HashCalculator {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        // 设置 panic hook
        utils::set_panic_hook();

        HashCalculator {
            blake3_hasher: blake3::Hasher::new(),
            md5_hasher: Md5::new(),
            hash_type: "blake3".to_string(), // 默认使用blake3
        }
    }

    // 设置要使用的哈希算法类型
    #[wasm_bindgen]
    pub fn set_hash_type(&mut self, hash_type: &str) {
        if hash_type == "blake3" || hash_type == "md5" {
            self.hash_type = hash_type.to_string();
        } else {
            log(&format!(
                "不支持的哈希类型: {}, 使用默认的 blake3",
                hash_type
            ));
            self.hash_type = "blake3".to_string();
        }
    }

    // 更新整体文件哈希
    #[wasm_bindgen]
    pub fn update(&mut self, data: &[u8]) {
        if self.hash_type == "blake3" {
            self.blake3_hasher.update(data);
        } else {
            self.md5_hasher.update(data);
        }
    }

    // 完成计算并返回整体文件哈希值
    #[wasm_bindgen]
    pub fn finalize(&self) -> String {
        if self.hash_type == "blake3" {
            let hash = self.blake3_hasher.clone().finalize();
            hash.to_hex().to_string()
        } else {
            // 对于MD5，先克隆当前的hasher，然后完成计算
            let hasher_clone = self.md5_hasher.clone();
            let result = hasher_clone.finalize();
            // 将结果转换为十六进制字符串
            format!("{:x}", result)
        }
    }

    // 计算单个块的哈希
    #[wasm_bindgen]
    pub fn calculate_chunk_hash(&self, data: &[u8]) -> String {
        if self.hash_type == "blake3" {
            let hash = blake3::hash(data);
            hash.to_hex().to_string()
        } else {
            // 为单个块创建新的MD5 hasher
            let mut hasher = Md5::new();
            hasher.update(data);
            let result = hasher.finalize();
            format!("{:x}", result)
        }
    }
}

// 直接计算整个数据的哈希（便捷函数）
#[wasm_bindgen]
pub fn calculate_hash(data: &[u8], hash_type: &str) -> String {
    utils::set_panic_hook();

    if hash_type == "blake3" {
        let hash = blake3::hash(data);
        hash.to_hex().to_string()
    } else if hash_type == "md5" {
        let mut hasher = Md5::new();
        hasher.update(data);
        let result = hasher.finalize();
        format!("{:x}", result)
    } else {
        // 默认使用blake3
        let hash = blake3::hash(data);
        hash.to_hex().to_string()
    }
}
