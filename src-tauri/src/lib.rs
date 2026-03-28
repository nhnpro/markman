use tauri::{Manager, Emitter};

#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| format!("Failed to read {}: {}", path, e))
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
                if file_path.ends_with(".md")
                    || file_path.ends_with(".markdown")
                    || file_path.ends_with(".mdx")
                {
                    let handle = app.handle().clone();
                    // Emit event after window is ready
                    tauri::async_runtime::spawn(async move {
                        // Small delay to ensure frontend is loaded
                        tokio::time::sleep(std::time::Duration::from_millis(500)).await;
                        let _ = handle.emit("open-file", file_path);
                    });
                }
            }
            Ok(())
        })
        .on_window_event(|_window, _event| {})
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
