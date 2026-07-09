/**
 * Primary navigation sidebar.
 * Fixed on desktop (lg+), slides in as an overlay drawer on smaller
 * viewports. Nav items are placeholders — real links/routes are wired
 * up once pages exist. Purely presentational shell — no routing logic.
 */
function Sidebar({ isOpen, onClose }) {
  const navItems = ['Overview', 'Activity', 'Settings'];

  return (
    <>
      {/* Mobile overlay */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity lg:hidden ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform border-r border-gray-200 bg-white transition-transform duration-200 ease-in-out dark:border-gray-800 dark:bg-gray-900 lg:static lg:z-auto lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <nav className="flex h-full flex-col gap-1 p-4">
          {navItems.map((item) => (
            <span
              key={item}
              className="cursor-default rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              {item}
            </span>
          ))}
        </nav>
      </aside>
    </>
  );
}

export default Sidebar;
