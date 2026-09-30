WorkflowLeadForm is the lead form on the `/workflow` page. Visitors pick problem-area chips, describe the problem, and submit with "Show Yorkstead the Problem". If `WORKFLOW_AUDIT_BOOKING_URL` is set, it also offers a booking link.

- Validation errors show under each field in red (`text-red-500`, `text-red-400` in dark).
- The success panel is an emerald-tinted `radius-2xl` box.

**The consumer provides** nothing. In the app it posts to the `submitWorkflowLead` server action. In these previews that action is replaced by a stand-in that sends nothing.
