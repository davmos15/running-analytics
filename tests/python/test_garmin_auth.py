from scripts import garmin_auth


def test_resolve_token_dir_prefers_env(monkeypatch, tmp_path):
    monkeypatch.setenv("GARMIN_TOKEN_DIR", str(tmp_path))
    assert garmin_auth.resolve_token_dir() == str(tmp_path)


def test_resolve_token_dir_defaults_to_a_tokens_dir(monkeypatch):
    monkeypatch.delenv("GARMIN_TOKEN_DIR", raising=False)
    d = garmin_auth.resolve_token_dir()
    assert d.endswith(".garmin_tokens")
