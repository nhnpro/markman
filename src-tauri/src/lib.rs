use tauri::Emitter;
use tauri::DragDropEvent;
use std::path::Path;

#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| format!("Failed to read {}: {}", path, e))
}

#[tauri::command]
fn read_md_files_in_dir(path: String) -> Result<Vec<(String, String)>, String> {
    let mut results = Vec::new();
    collect_md_with_content(Path::new(&path), &mut results);
    Ok(results)
}

fn is_markdown(path: &str) -> bool {
    let lower = path.to_lowercase();
    lower.ends_with(".md") || lower.ends_with(".markdown") || lower.ends_with(".mdx")
}

fn collect_md_paths(path: &Path, results: &mut Vec<String>) {
    if path.is_file() {
        if let Some(s) = path.to_str() {
            if is_markdown(s) {
                results.push(s.to_string());
            }
        }
    } else if path.is_dir() {
        if let Ok(entries) = std::fs::read_dir(path) {
            for entry in entries.flatten() {
                collect_md_paths(&entry.path(), results);
            }
        }
    }
}

fn collect_md_with_content(path: &Path, results: &mut Vec<(String, String)>) {
    if path.is_file() {
        if let Some(s) = path.to_str() {
            if is_markdown(s) {
                if let Ok(content) = std::fs::read_to_string(path) {
                    results.push((s.to_string(), content));
                }
            }
        }
    } else if path.is_dir() {
        if let Ok(entries) = std::fs::read_dir(path) {
            for entry in entries.flatten() {
                collect_md_with_content(&entry.path(), results);
            }
        }
    }
}

#[tauri::command]
fn write_file(path: String, content: String) -> Result<(), String> {
    std::fs::write(&path, &content).map_err(|e| format!("Failed to write {}: {}", path, e))
}

#[tauri::command]
async fn fetch_url(url: String) -> Result<String, String> {
    if !url.starts_with("http://") && !url.starts_with("https://") {
        return Err("Invalid URL: must start with http:// or https://".into());
    }

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| format!("HTTP client error: {}", e))?;

    let resp = client
        .get(&url)
        .header("User-Agent", "MarkMan/0.0.3")
        .send()
        .await
        .map_err(|e| format!("Fetch failed: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!("HTTP {}", resp.status()));
    }

    resp.text()
        .await
        .map_err(|e| format!("Read body failed: {}", e))
}

#[tauri::command]
fn reveal_in_finder(path: String) -> Result<(), String> {
    let p = Path::new(&path);
    let dir = if p.is_file() {
        p.parent().map(|d| d.to_string_lossy().to_string()).unwrap_or(path.clone())
    } else {
        path.clone()
    };
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg("-R")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(format!("/select,{}", &path))
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&dir)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    let _ = dir; // suppress unused warning on macOS/Windows
    Ok(())
}

use std::sync::Mutex;

static PENDING_FILE: Mutex<Option<String>> = Mutex::new(None);

#[tauri::command]
fn get_pending_file() -> Option<String> {
    PENDING_FILE.lock().unwrap().take()
}

fn queue_open_file(handle: &tauri::AppHandle, file_path: String) {
    // Store as pending so frontend can poll it
    *PENDING_FILE.lock().unwrap() = Some(file_path.clone());
    // Also emit with delay for when listener is ready
    let h = handle.clone();
    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(std::time::Duration::from_millis(1000)).await;
        let _ = h.emit("open-file", file_path);
    });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![read_file, write_file, read_md_files_in_dir, reveal_in_finder, fetch_url, get_pending_file])
        .setup(|app| {
            let args: Vec<String> = std::env::args().collect();
            if args.len() > 1 {
                let file_path = args[1].clone();
                if is_markdown(&file_path) {
                    queue_open_file(app.handle(), file_path);
                }
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::DragDrop(drag_event) = event {
                match drag_event {
                    DragDropEvent::Drop { paths, .. } => {
                        let mut md_files = Vec::new();
                        let mut urls = Vec::new();
                        for path in paths {
                            if let Some(s) = path.to_str() {
                                if s.starts_with("http://") || s.starts_with("https://") {
                                    urls.push(s.to_string());
                                    continue;
                                }
                            }
                            collect_md_paths(path, &mut md_files);
                        }
                        if !md_files.is_empty() {
                            let _ = window.emit("drop-files", md_files);
                        }
                        for url in urls {
                            let _ = window.emit("drop-url", url);
                        }
                    }
                    DragDropEvent::Enter { .. } => {
                        let _ = window.emit("drag-enter", ());
                    }
                    DragDropEvent::Leave => {
                        let _ = window.emit("drag-leave", ());
                    }
                    _ => {}
                }
            }
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app, event| {
            if let tauri::RunEvent::Opened { urls } = event {
                for url in urls {
                    let path = url.to_string();
                    let file_path = if path.starts_with("file://") {
                        urlencoding_decode(&path[7..])
                    } else {
                        path
                    };
                    if is_markdown(&file_path) {
                        queue_open_file(app, file_path);
                    }
                }
            }
        });
}

fn urlencoding_decode(s: &str) -> String {
    let mut result = String::with_capacity(s.len());
    let mut chars = s.bytes();
    while let Some(b) = chars.next() {
        if b == b'%' {
            let hi = chars.next().and_then(|c| (c as char).to_digit(16));
            let lo = chars.next().and_then(|c| (c as char).to_digit(16));
            if let (Some(h), Some(l)) = (hi, lo) {
                result.push((h * 16 + l) as u8 as char);
            }
        } else {
            result.push(b as char);
        }
    }
    result
}
