import { useState } from 'react';

import Container from '../components/Container.jsx';
import Header from '../components/Header.jsx';
import Sidebar from '../components/Sidebar.jsx';

/**
 * Application shell composed of Header + Sidebar + content area.
 * Wrap routed pages with this layout once pages exist:
 *   <MainLayout><Home /></MainLayout>
 * Holds only the sidebar open/closed UI state — no business logic.
 */
function MainLayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <Header onMenuClick={() => setIsSidebarOpen((prev) => !prev)} />

      <div className="flex">
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        <main className="min-w-0 flex-1">
          <Container className="py-6">{children}</Container>
        </main>
      </div>
    </div>
  );
}

export default MainLayout;
