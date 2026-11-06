use std::fs;
use std::path::PathBuf;
use tauri_plugin_shell::ShellExt;

fn get_save_path() -> PathBuf {
    if let Ok(appdata) = std::env::var("APPDATA") {
        let mut dir = PathBuf::from(appdata);
        dir.push("Flapcrypt");
        let _ = fs::create_dir_all(&dir);
        dir.push("save.json");
        return dir;
    }
    PathBuf::from("save.json")
}

#[tauri::command]
fn backup_save_data(payload: String) -> Result<(), String> {
    let path = get_save_path();
    fs::write(&path, payload).map_err(|e| e.to_string())
}

#[tauri::command]
fn load_save_data() -> Result<String, String> {
    let path = get_save_path();
    if path.exists() {
        fs::read_to_string(&path).map_err(|e| e.to_string())
    } else {
        Ok(String::new())
    }
}

#[tauri::command]
fn open_url(app: tauri::AppHandle, url: String) -> Result<(), String> {
    if let Err(_e) = app.shell().open(&url, None) {
        #[cfg(target_os = "windows")]
        {
            let _ = std::process::Command::new("cmd")
                .args(["/C", "start", "", &url])
                .spawn();
            return Ok(());
        }
        #[allow(unreachable_code)]
        return Err(_e.to_string());
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![backup_save_data, load_save_data, open_url])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
