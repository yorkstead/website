import type { WalkthroughStep } from "./walkthrough";

const base = "/media/barcodes/walkthrough";

export const barcodesWalkthroughSteps: WalkthroughStep[] = [
  {
    id: "directory",
    label: "Directory",
    device: "desktop",
    who: "HR or supervisor",
    title: "Start from the employee directory",
    body: "The Employees page lists active employees as last name, first name with an employee number. Each row has an Active tag, an Edit button and a Deactivate button.",
    detail: "A search box and a status filter sit at the top of the list.",
    image: { src: `${base}/directory.webp`, width: 1440, height: 900, alt: "Employee directory page listing active employees by name and number, each with Active, Edit and Deactivate controls." },
  },
  {
    id: "search",
    label: "Search",
    device: "desktop",
    who: "HR or supervisor",
    title: "Search by name",
    body: "Typing in the search box narrows the list to matching names while we type. The Add employee form sits below the list, with fields for a name and a numbers-only employee number.",
    detail: "The status filter switches between Active, Inactive and All.",
    image: { src: `${base}/search.webp`, width: 1440, height: 900, alt: "Directory filtered by a search term showing four matching employees, with the empty Add employee form underneath." },
  },
  {
    id: "edit",
    label: "Edit",
    device: "desktop",
    who: "HR or supervisor",
    title: "Edit an existing record",
    body: "Choosing Edit loads that employee into an Update record form below the list. We can change the name or the employee number, then save or cancel.",
    detail: "Deactivating keeps the record but removes the person from the label builder.",
    image: { src: `${base}/edit.webp`, width: 1440, height: 900, alt: "Update record form filled with an employee name and number, with Save changes and Cancel buttons." },
  },
  {
    id: "label",
    label: "Label",
    device: "desktop",
    who: "HR or supervisor",
    title: "Build labels and preview",
    body: "On the Label page we choose how many labels to print, from 1 to 8, and pick an employee for each. The live preview shows the name, the encoded value and the Code 128 barcode.",
    detail: "The preview also lists the print settings for the 2-1/3 by 3-3/8 inch label stock.",
    image: { src: `${base}/label.webp`, width: 1440, height: 900, alt: "Label builder with three employees selected and a live preview of a label showing a name and barcode." },
  },
  {
    id: "print",
    label: "Print",
    device: "desktop",
    who: "HR or supervisor",
    title: "Print the label sheet",
    body: "Print labels opens a sheet laid out two columns by four rows. Each chosen employee gets a label with name, value and barcode, and unused slots stay blank.",
    detail: "The browser print dialog opens automatically, with a button to open it again.",
    image: { src: `${base}/print.webp`, width: 1440, height: 900, alt: "Print sheet with three labels, each showing an employee name, number and a black Code 128 barcode." },
  },
];
