"""Garmin auth via garth token resume. Reuses the life-os token by default.

This module never logs in interactively. It resumes tokens minted once by the
life-os bootstrap (which uses curl_cffi to beat Garmin's Cloudflare login) and
hits the data API (connectapi), which is not Cloudflare-blocked -- so it runs
headless.
"""
import logging
import os

log = logging.getLogger("garmin.auth")

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
# Default to this project's own token dir; fall back to the life-os one if present.
LIFE_OS_TOKENS = os.path.abspath(os.path.join(PROJECT_DIR, "..", "life-os", ".garmin_tokens"))
LOCAL_TOKENS = os.path.join(PROJECT_DIR, ".garmin_tokens")


def resolve_token_dir():
    """Return the token directory to use.

    Order: GARMIN_TOKEN_DIR env, this project's .garmin_tokens, the life-os
    token dir, then the local default path (which may not exist yet)."""
    env = os.environ.get("GARMIN_TOKEN_DIR")
    if env:
        return env
    if os.path.exists(os.path.join(LOCAL_TOKENS, "oauth1_token.json")):
        return LOCAL_TOKENS
    if os.path.exists(os.path.join(LIFE_OS_TOKENS, "oauth1_token.json")):
        return LIFE_OS_TOKENS
    return LOCAL_TOKENS


def authenticate():
    """Resume garth tokens and return the Garmin displayName."""
    import garth
    token_dir = resolve_token_dir()
    if not os.path.exists(os.path.join(token_dir, "oauth1_token.json")):
        raise SystemExit(
            f"No Garmin tokens at {token_dir}. Copy life-os/.garmin_tokens here "
            f"or run life-os/scripts/garmin_bootstrap.py.")
    garth.resume(token_dir)
    dn = garth.client.profile["displayName"]
    log.info("Authenticated as %s", garth.client.profile.get("fullName") or dn)
    return dn
