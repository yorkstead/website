// Preview stand-ins for the site's server actions: nothing is sent anywhere.
const wait = () => new Promise((resolve) => setTimeout(resolve, 700));
const reply = { status: "success", message: "Preview only — nothing was sent." };

export async function submitContact() {
  await wait();
  return reply;
}

export async function submitWorkflowLead() {
  await wait();
  return reply;
}
