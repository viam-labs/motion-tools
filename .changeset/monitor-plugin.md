---
'@viamrobotics/visualization': major
---

Move monitor mode into the opt-in `Monitor` plugin: every mode is now plugin-contributed with mount order as priority, the mode is `none` when no mode plugins are mounted, and each mode plugin owns its own details cards
