use tauri::{Manager, Emitter};
use tauri::DragDropEvent;

#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| format!("Failed to read {}: {}", path, e))
}

fn is_markdown(path: &str) -> bool {
    path.ends_with(".md") || path.ends_with(".markdown") || path.ends_with(".mdx")
}

fn collect_md_files(path: &std::path::Path, results: &mut Vec<String>) {
    if path.is_file() {
        if let Some(s) = path.to_str() {
            if is_markdown(s) {
                results.push(s.to_string());
            }
        }
    } else if path.is_dir() {
        if let Ok(entries) = std::fs::read_dir(path) {
            for entry in entries.flatten() {
                collect_md_files(&entry.path(), results);
            }
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![read_file])
        .setup(|app| {
            // Check if launched with a file argument (double-click on .md file)
            let args: Vec<String> = std::env::args().collect();
            if args.len() > 1 {
                let file_path = args[1].clone();
                if is_markdown(&file_path) {
                    let handle = app.handle().clone();
                    tauri::async_runtime::spawn(async move {
                        tokio::time::sleep(std::time::Duration::from_millis(500)).await;
                        let _ = handle.emit("open-file", file_path);
                    });
                }
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            // Handle native drag-and-drop of files/folders
            if let tauri::WindowEvent::DragDrop(drag_event) = event {
                match drag_event {
                    DragDropEvent::Drop { paths, .. } => {
                        let mut md_files = Vec::new();
                        for path in paths {
                            collect_md_files(path, &mut md_files);
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
