// 隐藏 Windows 控制台窗口（release 模式）
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    masters_workbench_lib::run()
}
