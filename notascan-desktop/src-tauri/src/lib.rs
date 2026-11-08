use tauri::{Manager, PhysicalPosition, PhysicalSize, WebviewWindow};

/// Ajusta la ventana al área útil de su pantalla si se sale de ella (multiplataforma, 2026-11-08).
///
/// En el Mac de GitHub (pantalla de 1024 × 768) la ventana abrió corrida a la izquierda, con los botones del sistema
/// fuera de la pantalla. En una pantalla pequeña o con la barra de menús y el Dock ocupando espacio, la ventana se
/// recorta al área útil (sin barra de menús, Dock ni barra de tareas) y se coloca dentro. Si ya cabe, no se toca.
fn fit_to_work_area(window: &WebviewWindow) -> tauri::Result<()> {
    let Some(monitor) = window.current_monitor()?.or(window.primary_monitor()?) else {
        return Ok(());
    };
    let area = monitor.work_area();
    let (size, pos) = (window.outer_size()?, window.outer_position()?);
    let fits = pos.x >= area.position.x
        && pos.y >= area.position.y
        && pos.x + size.width as i32 <= area.position.x + area.size.width as i32
        && pos.y + size.height as i32 <= area.position.y + area.size.height as i32;
    if fits {
        return Ok(());
    }
    let width = size.width.min(area.size.width);
    let height = size.height.min(area.size.height);
    window.set_size(PhysicalSize::new(width, height))?;
    // Centrada dentro del área útil.
    let x = area.position.x + ((area.size.width - width) / 2) as i32;
    let y = area.position.y + ((area.size.height - height) / 2) as i32;
    window.set_position(PhysicalPosition::new(x, y))?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                // Un fallo al medir la pantalla no debe impedir que NotaScan abra.
                let _ = fit_to_work_area(&window);
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error al iniciar NotaScan");
}
