# NEX-FOREST — Project Overview

A plain-language guide to what this portal is, who uses it, and how day-to-day work happens.

---

## What is NEX-FOREST?

**NEX-FOREST** is an online plantation reporting portal for the Forest Department (TGFDC).

District Managers prepare and submit plantation reports from their division. The General Manager reviews all submitted reports from every division in one place.

Think of it as a shared official register: each division fills its own sheets, and the head office can open, search, and download them.

---

## Who uses it?

There are two kinds of accounts:

### 1. District Manager (DM)

- One account per division
- Divisions covered today:
  - Rangareddy  
  - Medak  
  - Mulugu  
  - Khagaznagar  
  - Paloncha  
  - Kothagudem  
  - Sathupally  

Each DM only sees and works on **their own** division’s reports.

### 2. General Manager (GM)

- One head-office account (`gm.forest`)
- Sees **all** submitted reports across divisions
- Can search, filter, open, and download reports as PDF

---

## How to open the portal

The live website address is:

**https://10abdulmoid-nex-forest-vista.nex-forest-vista.workers.dev**

- It runs on the internet (Cloudflare), not on someone’s laptop.
- Closing a computer or stopping local development does **not** turn the site off.
- Use a normal browser (Chrome, Edge, etc.). Prefer a hard refresh (Ctrl+F5) after major updates if something looks out of date.

---

## How to sign in

1. Open the link above.  
2. Enter your **username** and **password** (the same departmental credentials issued for this portal).  
3. Sign in.

Examples of usernames (not passwords):

- District Managers: `dm.rangareddy`, `dm.medak`, `dm.mulugu`, and so on  
- General Manager: `gm.forest`

**Notes**

- Login is username + password only. There is no Google / Gmail sign-in.
- Passwords are managed by the system administrators — do not share them.
- If login fails, check spelling and ask an admin to confirm your account is active.

---

## What a District Manager can do

After login, the DM desk shows the division name and account, then three areas of work:

### 1. Create a report

- **Create report** — open a blank spreadsheet-style sheet and fill it in (similar to Excel).
- **Upload Excel (.xlsx)** — upload an existing Excel file.  
  The upload is saved as an **in-progress draft** (not sent to the GM yet). You can open it later, edit it, then submit.

You can optionally attach an **abstract** sheet with the main report.

### 2. Saved in progress (drafts)

- Work you have **saved** but not yet submitted.
- Open any draft with **Continue** to edit.
- Use **Save** to keep progress.
- Use **Submit** when the report is ready for the GM office.
- Drafts can be **deleted** if they are no longer needed. Submitted reports cannot be deleted from this list.

### 3. Submitted reports

- Reports already sent to the GM.
- Open with **View** (read-only).
- Download as **PDF** from the list or from the open report.

---

## What the General Manager can do

After login, the GM sees a summary desk and a **View reports** section.

There the GM can:

- See all **submitted** reports from every division  
- Search by report name or related text  
- Filter by District Manager / division and by submission date range  
- **View** a report on screen (main sheet + abstract if included)  
- Download a report as **PDF**

Drafts that a DM has only saved (not submitted) do **not** appear for the GM.

---

## Typical work flow (simple)

```text
DM creates or uploads a report
        ↓
DM saves progress (draft stays on DM desk)
        ↓
DM submits when complete
        ↓
GM sees it under View reports
        ↓
GM (or DM) can download PDF of the submitted report
```

---

## Reports and downloads

| Action | Who | What it means |
|--------|-----|----------------|
| Save progress | DM | Keeps an unfinished report on the DM desk |
| Submit | DM | Sends the report to the GM office |
| Upload Excel | DM | Creates a new draft from an `.xlsx` file |
| Download PDF | DM & GM | Saves a printable PDF of a **submitted** report |

PDFs include the report title, division, DM username, and submission time, plus the main table (and abstract if present).

---

## Important points for everyday use

- **Internet required** — the portal is online.  
- **Only submitted work reaches the GM.** Saving is not the same as submitting.  
- **Submitted reports are read-only** for the DM (view and PDF only).  
- **Each DM works in their own division** — they do not edit other divisions’ sheets.  
- **Do not use personal email login** — use the issued departmental username and password.

---

## Where information is stored (plain language)

- The **website** is hosted on Cloudflare (always available when deployed).  
- **Accounts and report data** are stored securely in the project’s cloud database (Supabase).  
- Staff do not need to install special software beyond a browser.

Local development on a laptop is only for people who build or update the software. Day-to-day users only need the live web link.

---

## If something goes wrong

| Problem | What to try |
|---------|-------------|
| Site won’t open | Check the URL; try another network or browser |
| Can’t log in | Confirm username/password; ask admin to reset or re-activate the account |
| Report missing on GM side | Confirm the DM clicked **Submit**, not only **Save** |
| Old screen after an update | Hard refresh (Ctrl+F5) or clear cache for the site |
| Excel upload fails | Use an `.xlsx` file that is not empty; try again |

For account or password issues, contact the person who manages NEX-FOREST access for your office.

---

## Summary

NEX-FOREST is the Forest Department’s online desk for plantation reporting:

- **DMs** prepare, save, upload Excel, submit, and download their submitted reports as PDF.  
- **GM** reviews and downloads submitted reports from all divisions.  
- The live site stays online without anyone leaving a laptop running.

This overview is written for office users. Technical deployment and development details live in other project documents and with the IT / development team.
