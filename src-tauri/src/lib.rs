use tauri::Emitter;
use tauri::DragDropEvent;
use std::path::Path;
use std::sync::Mutex;

fn html_escape(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    for c in s.chars() {
        match c {
            '&' => out.push_str("&amp;"),
            '<' => out.push_str("&lt;"),
            '>' => out.push_str("&gt;"),
            '"' => out.push_str("&quot;"),
            '\'' => out.push_str("&#x27;"),
            _ => out.push(c),
        }
    }
    out
}

#[tauri::command]
fn render_markdown(markdown: String) -> String {
    use pulldown_cmark::{Parser, Options, Event, Tag, TagEnd, HeadingLevel};

    let opts = Options::all();
    let parser = Parser::new_ext(&markdown, opts);

    // Pre-allocate output buffer (~1.5x input is typical for HTML expansion)
    let mut html_output = String::with_capacity(markdown.len() * 3 / 2);
    let mut in_heading = false;
    let mut heading_text = String::new();
    let mut heading_level = 0u8;

    // Collect non-heading events to batch them for push_html
    let mut batch: Vec<Event> = Vec::new();

    for event in parser {
        match &event {
            Event::Start(Tag::Heading { level, .. }) => {
                // Flush any batched events first
                if !batch.is_empty() {
                    pulldown_cmark::html::push_html(&mut html_output, batch.drain(..));
                }
                in_heading = true;
                heading_text.clear();
                heading_level = match level {
                    HeadingLevel::H1 => 1,
                    HeadingLevel::H2 => 2,
                    HeadingLevel::H3 => 3,
                    HeadingLevel::H4 => 4,
                    HeadingLevel::H5 => 5,
                    HeadingLevel::H6 => 6,
                };
            }
            Event::End(TagEnd::Heading(_)) => {
                let id = slugify_text(&heading_text);
                html_output.push_str("<h");
                html_output.push(char::from(b'0' + heading_level));
                html_output.push_str(" id=\"");
                html_output.push_str(&id);
                html_output.push_str("\">");
                html_output.push_str(&heading_text);
                html_output.push_str("</h");
                html_output.push(char::from(b'0' + heading_level));
                html_output.push_str(">\n");
                in_heading = false;
            }
            Event::Text(text) if in_heading => {
                heading_text.push_str(&html_escape(text));
            }
            Event::Code(code) if in_heading => {
                heading_text.push_str("<code>");
                heading_text.push_str(&html_escape(code));
                heading_text.push_str("</code>");
            }
            _ if in_heading => {}
            _ => {
                batch.push(event);
            }
        }
    }
    // Flush remaining batched events
    if !batch.is_empty() {
        pulldown_cmark::html::push_html(&mut html_output, batch.into_iter());
    }
    html_output
}

fn slugify_text(text: &str) -> String {
    text.chars()
        .filter_map(|c| {
            if c.is_alphanumeric() { Some(c.to_ascii_lowercase()) }
            else if c == ' ' || c == '-' { Some('-') }
            else { None }
        })
        .collect::<String>()
        .trim_matches('-')
        .to_string()
}

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
fn fetch_url(url: String) -> Result<String, String> {
    if !url.starts_with("http://") && !url.starts_with("https://") {
        return Err("Invalid URL: must start with http:// or https://".into());
    }

    if !is_allowed_host(&url) {
        return Err("Requests to local or private network addresses are not allowed".into());
    }

    let mut resp = ureq::get(&url)
        .header("User-Agent", "MarkMan/0.0.7")
        .call()
        .map_err(|e| format!("Fetch failed: {}", e))?;

    if resp.status() != 200 {
        return Err(format!("HTTP {}", resp.status()));
    }

    resp.body_mut()
        .read_to_string()
        .map_err(|e| format!("Read body failed: {}", e))
}

/// Returns false for loopback, link-local, and RFC-1918 private addresses.
fn is_allowed_host(url: &str) -> bool {
    let after_scheme = if url.starts_with("https://") {
        &url[8..]
    } else {
        &url[7..]
    };
    // Extract host (stop at '/', ':', '?', '#')
    let host = after_scheme
        .split(&['/', ':', '?', '#'][..])
        .next()
        .unwrap_or("")
        .to_lowercase();

    // Reject empty host
    if host.is_empty() {
        return false;
    }
    // Loopback hostnames
    if host == "localhost" || host == "localhost." {
        return false;
    }
    // IPv6 loopback / unspecified
    if host == "[::1]" || host == "[::]" || host == "[::ffff:127.0.0.1]" {
        return false;
    }
    // 127.x.x.x loopback
    if host.starts_with("127.") {
        return false;
    }
    // 0.x.x.x (unspecified)
    if host.starts_with("0.") {
        return false;
    }
    // RFC-1918: 10.x.x.x
    if host.starts_with("10.") {
        return false;
    }
    // RFC-1918: 192.168.x.x
    if host.starts_with("192.168.") {
        return false;
    }
    // RFC-1918: 172.16.x.x – 172.31.x.x
    if let Some(rest) = host.strip_prefix("172.") {
        if let Some(second_octet) = rest.split('.').next() {
            if let Ok(n) = second_octet.parse::<u8>() {
                if (16..=31).contains(&n) {
                    return false;
                }
            }
        }
    }
    // Link-local: 169.254.x.x
    if host.starts_with("169.254.") {
        return false;
    }
    true
}

#[tauri::command]
fn open_url(url: String) -> Result<(), String> {
    if !url.starts_with("http://") && !url.starts_with("https://") {
        return Err("Invalid URL: must start with http:// or https://".into());
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&url)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(["/c", "start", "", &url])
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&url)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
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
    let _ = dir;
    Ok(())
}

static PENDING_FILE: Mutex<Option<String>> = Mutex::new(None);

#[tauri::command]
fn get_pending_file() -> Option<String> {
    PENDING_FILE.lock().unwrap().take()
}

fn queue_open_file(handle: &tauri::AppHandle, file_path: String) {
    *PENDING_FILE.lock().unwrap() = Some(file_path.clone());
    let h = handle.clone();
    std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_millis(1000));
        let _ = h.emit("open-file", file_path);
    });
}

#[tauri::command]
fn install_cli() -> Result<String, String> {
    let src = "/Applications/MarkMan.app/Contents/MacOS/markman";
    let dst = "/usr/local/bin/markman";

    // Remove existing symlink if present
    let _ = std::fs::remove_file(dst);

    #[cfg(unix)]
    {
        std::os::unix::fs::symlink(src, dst)
            .map_err(|e| format!("Failed to create symlink: {}. Try running: sudo ln -sf {} {}", e, src, dst))?;
    }
    #[cfg(not(unix))]
    {
        return Err("CLI install is only supported on macOS/Linux".into());
    }

    Ok(format!("CLI installed at {}", dst))
}

// ─── GUI Entry ─────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run(initial_file: Option<String>) {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            read_file, write_file, read_md_files_in_dir,
            reveal_in_finder, fetch_url, get_pending_file, install_cli, render_markdown, open_url
        ])
        .setup(move |app| {
            if let Some(file_path) = initial_file {
                queue_open_file(app.handle(), file_path);
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
        .run(|_app, _event| {
            #[cfg(target_os = "macos")]
            if let tauri::RunEvent::Opened { urls } = &_event {
                for url in urls {
                    let path = url.to_string();
                    let file_path = if path.starts_with("file://") {
                        urlencoding_decode(&path[7..])
                    } else {
                        path
                    };
                    if is_markdown(&file_path) {
                        queue_open_file(_app, file_path);
                    }
                }
            }
        });
}

// ─── CLI Serve ─────────────────────────────────────────

pub fn serve(file: &str, port: u16) {
    use pulldown_cmark::{Parser, Options, html};
    use std::io::{Read, Write};
    use std::net::TcpListener;

    let content = match std::fs::read_to_string(file) {
        Ok(c) => c,
        Err(e) => {
            eprintln!("Error: Failed to read '{}': {}", file, e);
            std::process::exit(1);
        }
    };

    // Strip frontmatter
    let body = if content.starts_with("---\n") {
        if let Some(end) = content[4..].find("\n---\n") {
            &content[end + 8..]
        } else {
            &content
        }
    } else {
        &content
    };

    // Render markdown to HTML
    let opts = Options::all();
    let parser = Parser::new_ext(body, opts);
    let mut html_output = String::new();
    html::push_html(&mut html_output, parser);

    let title = html_escape(file.split('/').last().unwrap_or(file));
    let file_escaped = html_escape(file);
    let page = format!(
        r#"<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<style>
  body {{ max-width: 800px; margin: 40px auto; padding: 0 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; line-height: 1.6; color: #24292f; }}
  h1, h2, h3 {{ border-bottom: 1px solid #d1d9e0; padding-bottom: 0.3em; }}
  code {{ background: #f6f8fa; padding: 0.2em 0.4em; border-radius: 6px; font-size: 85%; }}
  pre {{ background: #f6f8fa; padding: 16px; border-radius: 6px; overflow-x: auto; }}
  pre code {{ background: none; padding: 0; }}
  blockquote {{ border-left: 4px solid #d1d9e0; margin: 0; padding: 0 16px; color: #656d76; }}
  table {{ border-collapse: collapse; width: 100%; }}
  th, td {{ border: 1px solid #d1d9e0; padding: 6px 13px; }}
  th {{ background: #f6f8fa; }}
  a {{ color: #0969da; text-decoration: none; }}
  a:hover {{ text-decoration: underline; }}
  img {{ max-width: 100%; }}
  hr {{ border: none; border-top: 1px solid #d1d9e0; }}
  .footer {{ margin-top: 40px; padding-top: 16px; border-top: 1px solid #d1d9e0; color: #656d76; font-size: 12px; }}
</style>
</head>
<body>
{html_output}
<div class="footer">Served by MarkMan &middot; <a href="file://{file_escaped}">{title}</a></div>
</body>
</html>"#,
        title = title,
        html_output = html_output,
        file_escaped = file_escaped,
    );

    let addr = format!("127.0.0.1:{}", port);
    let listener = TcpListener::bind(&addr).unwrap_or_else(|e| {
        eprintln!("Error: Cannot bind to port {}: {}", port, e);
        std::process::exit(1);
    });

    println!("\x1b[1;32m✓\x1b[0m Serving \x1b[1m{}\x1b[0m at \x1b[4mhttp://localhost:{}\x1b[0m", file, port);
    println!("  Press Ctrl+C to stop\n");

    let response = format!(
        "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
        page.len(),
        page
    );

    for stream in listener.incoming() {
        if let Ok(mut stream) = stream {
            let mut buf = [0u8; 1024];
            let _ = stream.read(&mut buf);
            let _ = stream.write_all(response.as_bytes());
        }
    }
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
