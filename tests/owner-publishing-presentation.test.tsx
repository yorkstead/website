import { expect,test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ClientPublishing,PublicationContent } from "@/components/dashboard/client-publishing";
import { clientProjectDemo } from "@/lib/client-project-demo";
test("owner publishing shell offers existing-workspace navigation, labelled selector and safe loading",()=>{
  const html=renderToStaticMarkup(<ClientPublishing />);
  expect(html).toContain('Client Publishing');
  expect(html).toContain('Existing project');
  expect(html).toContain('Refresh review queue');
  expect(html).toContain('aria-busy="true"');
  expect(html).toContain('Customer access remains disabled in production');
  expect(html).toContain('href="/dashboard"');
  expect(html).not.toContain('Northline');
});
test("review snapshots render allowed data as escaped text without source internals",()=>{
  const html=renderToStaticMarkup(<PublicationContent content={{...clientProjectDemo.overview,title:'<script>private()</script>'}} />);
  expect(html).toContain('&lt;script&gt;');
  expect(html).not.toContain('<script>private()');
  expect(html).not.toContain('source_digest');
});
