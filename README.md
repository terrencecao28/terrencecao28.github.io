# Your Photography Website

You can change every piece of text and every photo on this site, before or
after it goes live. Once the site is published, you use a free online editor
(Pages CMS) to make changes. You just sign in, edit and click Save. There's no
code involved.

---

## 1. Preview it on your Mac

Double-click **`preview.command`**. Your browser opens the site. Photos you add to the `photos/` folders show up when you refresh the page. Close the
Terminal window that appears when you're done.

> The first time, macOS may say it can't be opened. If so, right-click
> `preview.command`, choose **Open**, then click **Open** again.

---

## 2. Publish it (one-time setup, about 10 minutes, free)

The site is hosted on **GitHub Pages**. GitHub stores your website's files and
the online editor saves your changes there.

1. Create a free account at **github.com**.
2. Download **GitHub Desktop** (desktop.github.com) and sign in.
3. In GitHub Desktop, choose **File → Add Local Repository…** and pick this
   website folder. When it says it isn't a repository yet, click
   **create a repository**, then click **Create Repository**.
4. Click **Publish repository**. **Untick "Keep this code private"**, because free
   GitHub Pages needs a public repository. Then click **Publish**.
5. On github.com, open your new repository and go to **Settings → Pages**.
   Under *Build and deployment*, set **Source: Deploy from a branch**, set the
   branch to **main** and the folder to **/ (root)**, then click **Save**.
6. After a minute or two your site is live at
   `https://YOUR-USERNAME.github.io/REPOSITORY-NAME/`. The address is shown on that
   same Settings → Pages screen.

*(Optional) To use your own domain, like yourname.com, add it under
Settings → Pages → Custom domain.*

---

## 3. Edit your site any time (after publishing)

1. Go to **app.pagescms.org** and click **Sign in with GitHub**.
2. Choose your website's repository.
3. On the left you'll see:
   - **Site settings**: your name, tagline, **email** (where contact form
     messages go) and **Instagram link**
   - **Home page**: the 6 photos around your name, plus an optional signature image
   - **Galleries**: add, rename, remove or reorder galleries, and upload photos
   - **About page**: portrait, headline, bio and awards (with a spot for each organization's logo)
   - **Contact page**: headline, intro text, a photo and the form's dropdown options
4. Make your changes and click **Save**. The live site updates within about a
   minute. Refresh the page to see it.

**Adding photos:** open **Galleries**, expand a gallery, and click the add
button under **Photos** to upload new images. Drag photos to reorder them. To make a
new gallery, click **Add an entry** at the bottom of the gallery list.

**Tip:** before uploading, resize photos to about 2000–2500px on the long
edge (in Lightroom, Photos or Preview). Full-size camera files make the site slow.

---

## 4. Contact form → your email

Messages are sent by **Web3Forms** (free) to **terrencecao@icloud.com**, the
address the access key was created with. The key is in **Site settings →
Contact form key** (`web3formsKey` in `content/site.json`).

- To send messages to a different address, create a new key at
  **web3forms.com** with that address and replace the key.
- Check your Junk folder if a message doesn't show up.

## 5. Instagram button

Put your full Instagram address (e.g. `https://instagram.com/yourhandle`) in
**Site settings → Instagram link**. It's used for the icon in the header and
the link in the footer. Clear the field to hide both.

---

## Editing files directly (optional)

Everything the editor changes lives in the **`content/`** folder as plain text
files: `site.json`, `home.json`, `galleries.json`, `about.json` and
`contact.json`. You can also open these in any text editor.

---

## Adding photos from your computer (the easy way)

The `photos/` folder has one folder per gallery (`industrial`, `golden`,
`antarctic`, `stills`, `shapes`, `landscape`, `people`, `street`) plus
`_home` for the 6 home page photos.

- **Drop photos into a folder** and they appear in that gallery. The first
  photo you add replaces the sample photos.
- **Order:** photos are shown in filename order. Name them `01.jpg`,
  `02.jpg`… to choose it.
- **Remove a photo:** delete it from the folder.
- **New gallery:** make a new folder (e.g. `photos/weddings/`) and put photos in it.
- **Fit:** any shape works. Gallery pages show each photo whole, in its own
  shape. The gallery tile and home page photos are cropped to fill their spot.
- **Cover photo:** name a photo starting with `firstphoto` (e.g.
  `firstphotogolden.jpg`) and it becomes the gallery's cover and is shown
  first. Otherwise the first photo is used.
- **iPhone photos (.heic)** are converted to JPG automatically.

**While previewing** (`preview.command` open), new photos show up when you
refresh the page.

**Your originals stay on your Mac.** The site uses smaller copies (2400px,
about 1 MB each) that are made automatically in `images/gallery/`. Your
full-size files in `photos/` are never changed or uploaded.

**To put new photos on the live site:** add them to the folders, open
`preview.command` once (that makes the web copies), then in GitHub Desktop
click **Commit to main**, then **Push origin**.
