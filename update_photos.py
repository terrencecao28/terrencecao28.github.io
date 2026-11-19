#!/usr/bin/env python3
"""
Keeps your galleries in sync with the folders inside photos/.

You normally never run this yourself: the preview (preview.command) runs it
every time a page loads, so a photo you drop into a folder shows up when you
refresh.

HOW THE FOLDERS WORK
  photos/<gallery>/   Every photo in the folder is shown in that gallery, in
                      filename order (name them 01.jpg, 02.jpg... to choose the
                      order). Delete a photo from the folder and it disappears
                      from the site. A new folder becomes a new gallery.
  firstphoto...       Name a photo starting with "firstphoto" (for example
                      firstphotogolden.jpg) to make it the gallery's cover.
  photos/_home/       Up to 6 photos for the home page, in filename order.
  _info.txt           Optional title and description for each folder.

Your original files stay in photos/ on your Mac and are never changed or
uploaded. The website uses smaller copies (2400px, made automatically) that
are saved in images/gallery/. That keeps the site fast and small enough to
publish.

Photos uploaded through the online editor are kept as they are.
"""
import json
import os
import re
import shutil
import subprocess
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
PHOTOS_DIR = os.path.join(ROOT, "photos")
WEB_DIR = os.path.join(ROOT, "images", "gallery")
WEB_URL = "images/gallery"
SMALL_DIR = os.path.join(ROOT, "images", "small")
SMALL_URL = "images/small"
GALLERIES_FILE = os.path.join(ROOT, "content", "galleries.json")
HOME_FILE = os.path.join(ROOT, "content", "home.json")
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".tif", ".tiff", ".heic", ".heif"}
MAX_EDGE = 2400  # longest side, in pixels, of the photos on the website
SMALL_EDGE = 1200  # quicker-loading copies used in the photo grids and home page

# Width and height of every web photo, saved in galleries.json so pages can be
# laid out before the photos have finished downloading.
SIZES = {}
SEEN = set()

QUIET = "--quiet" in sys.argv


def say(msg):
    if not QUIET:
        print(msg)


def slugify(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def natural(f):
    return [int(t) if t.isdigit() else t.lower() for t in re.split(r"(\d+)", f)]


def originals_in(folder):
    return sorted(
        (f for f in os.listdir(folder)
         if os.path.splitext(f)[1].lower() in IMAGE_EXTS and not f.startswith(".")),
        key=natural,
    )


def web_name(original):
    return (slugify(os.path.splitext(original)[0]) or "photo") + ".jpg"


def resize(src, dst, edge, quality):
    """Save a JPG copy of src whose longest side is at most `edge` pixels."""
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    tmp = dst + ".tmp.jpg"
    if sys.platform == "darwin":
        cmd = ["sips", "-Z", str(edge), "-s", "format", "jpeg", "-s", "formatOptions", str(quality), src, "--out", tmp]
        ok = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode == 0
    else:
        try:
            from PIL import Image, ImageOps
            with Image.open(src) as im:
                im = ImageOps.exif_transpose(im).convert("RGB")
                im.thumbnail((edge, edge), Image.LANCZOS)
                im.save(tmp, quality=quality, optimize=True, progressive=True)
            ok = True
        except Exception:
            ok = False
    if ok and os.path.exists(tmp):
        os.replace(tmp, dst)
        return True
    if os.path.exists(tmp):
        os.remove(tmp)
    return False


def size_of(path):
    if sys.platform == "darwin":
        out = subprocess.run(["sips", "-g", "pixelWidth", "-g", "pixelHeight", path],
                             capture_output=True, text=True).stdout
        nums = re.findall(r"pixel(?:Width|Height): (\d+)", out)
        return [int(nums[0]), int(nums[1])] if len(nums) == 2 else None
    try:
        from PIL import Image
        with Image.open(path) as im:
            return list(im.size)
    except Exception:
        return None


def newer(src, dst):
    return not os.path.exists(dst) or os.path.getmtime(dst) < os.path.getmtime(src)


def make_web_copy(src, dst, url):
    """Fast-loading JPG copies of an original: a 2400px one for full-screen
    viewing and a 1200px one for the grids (only redone when the original changes)."""
    changed = False
    if newer(src, dst):
        if not resize(src, dst, MAX_EDGE, 82):
            say(f"  Couldn't read {os.path.relpath(src, ROOT)} (skipped)")
            return False
        say(f"  Prepared {os.path.relpath(src, ROOT)}")
        changed = True
    small = os.path.join(SMALL_DIR, os.path.relpath(dst, WEB_DIR))
    if newer(dst, small):
        resize(dst, small, SMALL_EDGE, 78)
    if changed or url not in SIZES:
        dims = size_of(dst)
        if dims:
            SIZES[url] = dims
    SEEN.add(url)
    return True


def sync_folder(name):
    """Make web copies for one photos/ folder. Returns the web paths, in order,
    plus the web path of the "firstphoto" cover (or None)."""
    folder = os.path.join(PHOTOS_DIR, name)
    files = originals_in(folder)
    first = next((f for f in files if f.lower().startswith("firstphoto")), None)
    if first:
        files = [first] + [f for f in files if f != first]
    paths, used = [], set()
    for f in files:
        out = web_name(f)
        if out in used:  # e.g. photo.jpg and photo.png
            out = slugify(f) + ".jpg"
        used.add(out)
        url = f"{WEB_URL}/{name}/{out}"
        if make_web_copy(os.path.join(folder, f), os.path.join(WEB_DIR, name, out), url):
            paths.append(url)
    # Remove web copies of photos that were deleted from the folder.
    for base in (WEB_DIR, SMALL_DIR):
        web_folder = os.path.join(base, name)
        if os.path.isdir(web_folder):
            for f in os.listdir(web_folder):
                if f not in used:
                    os.remove(os.path.join(web_folder, f))
    cover = f"{WEB_URL}/{name}/{web_name(first)}" if first else None
    return paths, (cover if cover in paths else None)


def read_info(folder):
    info = {}
    path = os.path.join(folder, "_info.txt")
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and ":" in line:
                    key, value = line.split(":", 1)
                    info[key.strip().lower()] = value.strip()
    return info


def is_demo(src):
    return isinstance(src, str) and "picsum.photos" in src


def missing(path):
    return (isinstance(path, str) and path.startswith(("photos/", WEB_URL + "/"))
            and not os.path.exists(os.path.join(ROOT, path)))


def save_if_changed(path, data, before):
    text = json.dumps(data, indent=2, ensure_ascii=False) + "\n"
    if text != before:
        with open(path, "w", encoding="utf-8") as f:
            f.write(text)
        return True
    return False


def sync_galleries():
    with open(GALLERIES_FILE, encoding="utf-8") as f:
        before = f.read()
    data = json.loads(before)
    galleries = data.setdefault("galleries", [])

    for name in sorted(os.listdir(PHOTOS_DIR)):
        folder = os.path.join(PHOTOS_DIR, name)
        if not os.path.isdir(folder) or name.startswith((".", "_")):
            continue
        info = read_info(folder)
        title = info.get("title") or name.replace("-", " ").replace("_", " ").title()
        folder_photos, first_cover = sync_folder(name)
        gallery = next((g for g in galleries
                        if slugify(g.get("title", "")) in (slugify(title), slugify(name))), None)
        if gallery is None:
            if not folder_photos:
                continue
            gallery = {"title": title, "description": info.get("description", ""), "cover": "", "photos": []}
            galleries.append(gallery)

        ours = (f"{WEB_URL}/{name}/", f"photos/{name}/")
        others = [p for p in gallery.get("photos") or []
                  if not (isinstance(p, str) and p.startswith(ours))]
        if folder_photos:
            others = [p for p in others if not is_demo(p)]  # real photos replace the samples
        gallery["photos"] = folder_photos + others

        cover = gallery.get("cover") or ""
        if (folder_photos and is_demo(cover)) or cover.startswith(ours):
            cover = ""
        gallery["cover"] = first_cover or cover

    # A photo whose file is gone (or whose whole folder was removed) is dropped.
    for g in galleries:
        g["photos"] = [p for p in g.get("photos") or [] if not missing(p)]
        if missing(g.get("cover") or ""):
            g["cover"] = ""

    # Web copies of folders that no longer exist are removed.
    for base in (WEB_DIR, SMALL_DIR):
        if os.path.isdir(base):
            for name in os.listdir(base):
                if not os.path.isdir(os.path.join(PHOTOS_DIR, name)) and os.path.isdir(os.path.join(base, name)):
                    shutil.rmtree(os.path.join(base, name))

    data["sizes"] = {k: SIZES[k] for k in sorted(SEEN) if k in SIZES}

    if save_if_changed(GALLERIES_FILE, data, before):
        for g in galleries:
            say(f"  {g['title']}: {len(g['photos'])} photo(s)")
        return True
    return False


def sync_home():
    home_dir = os.path.join(PHOTOS_DIR, "_home")
    with open(HOME_FILE, encoding="utf-8") as f:
        before = f.read()
    home = json.loads(before)
    photos = home.get("photos") or []
    files = sync_folder("_home")[0] if os.path.isdir(home_dir) else []
    if files:
        home["photos"] = files[:6]
    elif photos and all(isinstance(p, str) and p.startswith((f"{WEB_URL}/_home/", "photos/_home/")) for p in photos):
        home["photos"] = []  # folder emptied: go back to the gallery cover photos
    if save_if_changed(HOME_FILE, home, before):
        say(f"  Home page: {len(home['photos'])} photo(s)")
        return True
    return False


def main():
    if not os.path.isdir(PHOTOS_DIR):
        sys.exit("No photos/ folder found next to this script.")
    with open(GALLERIES_FILE, encoding="utf-8") as f:
        SIZES.update(json.load(f).get("sizes") or {})
    changed = sync_home()  # first, so its photo sizes are saved too
    changed = sync_galleries() or changed
    say("Photos updated. Refresh the page to see them." if changed else "Everything is already up to date.")


if __name__ == "__main__":
    main()
