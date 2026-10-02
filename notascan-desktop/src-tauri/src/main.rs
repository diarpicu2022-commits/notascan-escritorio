// Evita una consola extra en Windows al ejecutar la versión empaquetada.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    notascan_lib::run()
}
