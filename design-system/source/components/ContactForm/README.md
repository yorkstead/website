ContactForm is the project-brief form in the home page's contact section. Its fields are name, email, optional company, project type, working budget and problem description, and it ends with a primary "Send project brief" Button.

- It reads `?product=`, `?service=` or `?engagement=` from the URL. When one matches, it shows a "Conversation context" panel tinted in `primary` and preselects the project type.
- While sending, the button shows a spinning `LoaderCircle`. On success the form is replaced by a confirmation panel.
- Field errors use `destructive` text.

**The consumer provides** nothing. In the app it posts to the `submitContact` server action. In these previews that action is replaced by a stand-in that sends nothing and returns "Preview only — nothing was sent."
