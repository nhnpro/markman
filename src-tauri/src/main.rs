#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    let args: Vec<String> = std::env::args().skip(1).collect();

    match args.first().map(|s| s.as_str()) {
        None => markman_lib::run(None),
        Some("--help" | "-h") => {
            println!("markman {} — A Notion-style markdown viewer and editor\n", env!("CARGO_PKG_VERSION"));
            println!("Usage: markman [FILE]");
            println!("       markman open <FILE>");
            println!("       markman serve <FILE> [-p PORT]\n");
            println!("Commands:");
            println!("  open <FILE>        Open a markdown file in the GUI");
            println!("  serve <FILE>       Serve a markdown file as HTML on localhost");
            println!("    -p, --port PORT  Port to listen on (default: 3000)\n");
            println!("Options:");
            println!("  -h, --help         Show this help");
            println!("  -V, --version      Show version");
        }
        Some("--version" | "-V") => {
            println!("markman {}", env!("CARGO_PKG_VERSION"));
        }
        Some("open") => {
            let path = args.get(1).cloned();
            markman_lib::run(path);
        }
        Some("serve") => {
            let file = args.get(1).unwrap_or_else(|| {
                eprintln!("Error: 'serve' requires a file argument");
                std::process::exit(1);
            });
            let port = parse_port(&args[2..]);
            markman_lib::serve(file, port);
        }
        Some(arg) if !arg.starts_with('-') => {
            markman_lib::run(Some(arg.to_string()));
        }
        Some(arg) => {
            eprintln!("Unknown option: {}\nTry 'markman --help'", arg);
            std::process::exit(1);
        }
    }
}

fn parse_port(args: &[String]) -> u16 {
    let mut i = 0;
    while i < args.len() {
        match args[i].as_str() {
            "-p" | "--port" => {
                return args.get(i + 1)
                    .and_then(|s| s.parse().ok())
                    .unwrap_or_else(|| {
                        eprintln!("Error: --port requires a number");
                        std::process::exit(1);
                    });
            }
            _ => {}
        }
        i += 1;
    }
    3000
}
