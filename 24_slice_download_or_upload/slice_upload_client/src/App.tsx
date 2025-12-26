import FileUploader from './components/FileUploader';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-800 mb-4">
            文件分片上传
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            支持大文件分片上传、断点续传、实时进度显示和多文件并发处理
          </p>
        </header>
        <main>
          <FileUploader />
        </main>
      </div>
    </div>
  );
}

export default App;
