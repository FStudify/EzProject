import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import TaskShareCard from './TaskShareCard';
import MeetingShareCard from './MeetingShareCard';
import FileShareCard from './FileShareCard';
import MentionText from './MentionText';

interface RichMessageRendererProps {
  content: string;
}

export default function RichMessageRenderer({ content }: RichMessageRendererProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      urlTransform={(url) => url}
      components={{
        p: ({ node, ...props }) => <p className="mb-0 inline" {...props} />,
        a: (props) => {
          const { href, children } = props;
          const textContent = String(children);
          
          if (!href) return <a {...props} />;

          if (href.startsWith('mention://')) {
            const userId = href.replace('mention://', '');
            const name = textContent.replace(/^@/, '');
            return <MentionText userId={userId} name={name} />;
          }

          if (href.startsWith('task://')) {
            const taskId = href.replace('task://', '');
            return <TaskShareCard taskId={taskId} fallbackTitle={textContent} />;
          }

          if (href.startsWith('meeting://')) {
            // URL format: meeting://id?date=xxx&status=xxx
            try {
              const url = new URL(href);
              const meetingId = url.hostname;
              const date = url.searchParams.get('date') || new Date().toISOString();
              const status = url.searchParams.get('status') || 'SCHEDULED';
              return <MeetingShareCard meetingId={meetingId} title={textContent} date={date} status={status} />;
            } catch {
              const meetingId = href.replace('meeting://', '');
              return <MeetingShareCard meetingId={meetingId} title={textContent} date={new Date().toISOString()} status="SCHEDULED" />;
            }
          }

          if (href.startsWith('file://')) {
            // URL format: file://url?size=xxx&uploader=yyy
            try {
              const url = new URL(href);
              // Extract the actual file URL by removing the custom protocol part
              // Wait, URL API will parse file://... 
              // We can just use search params
              const actualUrl = url.pathname.replace('//', '') || url.hostname; // Handling file://host or file:///path
              const size = url.searchParams.get('size') || 'Unknown size';
              const uploader = url.searchParams.get('uploader') || 'Unknown';
              return <FileShareCard url={actualUrl} name={textContent} size={size} uploader={uploader} />;
            } catch {
               return <FileShareCard url="#" name={textContent} size="Unknown" uploader="Unknown" />;
            }
          }

          return (
            <a {...props} className="text-blue-500 hover:underline" target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
