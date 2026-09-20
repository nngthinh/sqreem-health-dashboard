import ReactMarkdown from 'react-markdown'
import rehypeSanitize from 'rehype-sanitize'
import remarkGfm from 'remark-gfm'

/** Model output is untrusted markup; sanitising is what makes rendering it safe. */
export function Markdown({ prose }: { prose: string }) {
  return (
    <div className="space-y-2 [&_a]:underline [&_li]:my-0.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_table]:block [&_table]:overflow-x-auto [&_ul]:list-disc [&_ul]:pl-5">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
        {prose}
      </ReactMarkdown>
    </div>
  )
}
