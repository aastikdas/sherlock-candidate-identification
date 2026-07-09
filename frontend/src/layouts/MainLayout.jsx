import Header from '../components/Header.jsx';

/**
 * Application shell composed of Header + full-width content area.
 * Wrap routed pages with this layout once pages exist:
 *   <MainLayout><Home /></MainLayout>
 */
function MainLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <Header />

      <div className="flex">
        <main className="min-w-0 flex-1">
          <div className="w-full px-4 sm:px-6 lg:px-8 py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

export default MainLayout;
