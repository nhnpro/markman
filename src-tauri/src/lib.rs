use tauri::{Manager, Emitter};
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![read_file, read_md_files_in_dir])
        .setup(|app| {
            let args: Vec<String> = std::env::args().collect();
            if args.len() > 1 {
                let file_path = args[1].clone();
                if is_markdown(&file_path) {
                    let handle = app.handle().clone();
                    tauri::async_runtime::spawn(async move {
                        tokio::time::sleep(std::time::Duration::from_millis(800)).await;
                        let _ = handle.emit("open-file", file_path);
                    });
                }
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::DragDrop(drag_event) = event {
                match drag_event {
                    DragDropEvent::Drop { paths, .. } => {
                        let mut md_files = Vec::new();
                        for path in paths {
                            collect_md_paths(path, &mut md_files);
                        }
                        if !md_files.is_empty() {
                            let _ = window.emit("drop-files", md_files);
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
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
