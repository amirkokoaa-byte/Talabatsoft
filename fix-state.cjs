const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  `  const [historyList, setHistoryList] = useState<HistorySession[]>([]);`,
  `  const [historyList, setHistoryList] = useState<HistorySession[]>([]);
  const [expandedHistory, setExpandedHistory] = useState<Record<string, boolean>>({});`
);

fs.writeFileSync('src/App.tsx', content);
