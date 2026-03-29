#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use clap::{Parser, Subcommand};

#[derive(Parser)]
#[command(name = "markman", version, about = "A Notion-style markdown viewer and editor")]
struct Cli {
    #[command(subcommand)]
    command: Option<Commands>,

    /// File path or URL to open (shorthand for 'open')
    #[arg(value_name = "FILE")]
    file: Option<String>,
}

#[derive(Subcommand)]
enum Commands {
    /// Open a markdown file or URL in the GUI
    Open {
        /// File path or URL
        path: String,
    },
    /// Serve a markdown file as HTML on localhost
    Serve {
        /// Markdown file to serve
        file: String,
        /// Port to listen on
        #[arg(short, long, default_value = "3000")]
        port: u16,
    },
}

fn main() {
    // First check if this is a bare file arg (no subcommand, no flags)
    // This handles: markman file.md  and  macOS open-with launching
    let raw_args: Vec<String> = std::env::args().collect();

    // No args → launch GUI
    if raw_args.len() <= 1 {
        markman_lib::run(None);
        return;
    }

    // Try clap parsing
    match Cli::try_parse() {
        Ok(cli) => match cli.command {
            Some(Commands::Open { path }) => {
                markman_lib::run(Some(path));
            }
            Some(Commands::Serve { file, port }) => {
                markman_lib::serve(&file, port);
            }
            None => {
                // No subcommand — use the positional file arg
                markman_lib::run(cli.file);
            }
        },
        Err(e) => {
            // If it looks like a file path (not a flag), treat as implicit open
            let arg = &raw_args[1];
            if !arg.starts_with('-') {
                markman_lib::run(Some(arg.clone()));
            } else {
                e.exit();
            }
        }
    }
}
