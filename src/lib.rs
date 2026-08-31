use zed_extension_api as zed;

struct AutoToolsExtension;

impl zed::Extension for AutoToolsExtension {
    fn new() -> Self {
        Self
    }

    fn language_server_command(
        &mut self,
        _id: &zed::LanguageServerId,
        worktree: &zed::Worktree,
    ) -> zed::Result<zed::Command> {
        let home = worktree
            .shell_env()
            .iter()
            .find(|(key, _)| key == "HOME")
            .map(|(_, value)| value.clone())
            .ok_or_else(|| "HOME not found in shell env".to_string())?;
        let script =
            format!("{home}/.local/zed.app/extensions/zed-textile/tools/auto_lsp.py");
        Ok(zed::Command::new("python3").arg(script))
    }
}

zed::register_extension!(AutoToolsExtension);
