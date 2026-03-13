/**
 * Dynamic Logout Menu Generator
 * @param {string} triggerId - ID of the element to click
 * @param {string} menuId - ID of the empty div where items will be injected
 * @param {Array} items - Array of objects {name: string, link: string, isLogout: boolean}
 */
const setupDynamicMenu = (triggerId, menuId, items) => {
    const trigger = document.getElementById(triggerId);
    const menu = document.getElementById(menuId);

    if (!trigger || !menu) return;

    // 1. Menu Items Generate Karo
    menu.innerHTML = ''; // Clear existing content
    
    // Menu ki basic styling (Agar CSS file mein nahi hai toh)
    menu.style.display = 'none';
    menu.style.position = 'absolute';
    menu.style.backgroundColor = '#fff';
    menu.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.1)';
    menu.style.borderRadius = '12px';
    menu.style.padding = '8px';
    menu.style.minWidth = '160px';
    menu.style.right='0px'

    items.forEach(item => {
        const anchor = document.createElement('a');
        anchor.href = item.link || '#';
        anchor.textContent = item.name;
        
        // Basic Styles for Items
        anchor.style.display = 'block';
        anchor.style.padding = '10px 16px';
        anchor.style.textDecoration = 'none';
        anchor.style.color = item.name.toLowerCase() === 'logout' ? '#ef4444' : '#374151';
        anchor.style.fontSize = '14px';
        anchor.style.borderRadius = '8px';
        anchor.style.transition = 'background 0.2s';

        // Hover Effect
        anchor.onmouseover = () => anchor.style.backgroundColor = '#f3f4f6';
        anchor.onmouseout = () => anchor.style.backgroundColor = 'transparent';

        // Agar specific logout logic chahiye
        if (item.isLogout) {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                console.log("Logging out...");
                // Session clear logic yahan aayega
                window.location.href = item.link;
            });
        }

        menu.appendChild(anchor);
    });

    // 2. Toggle Logic
    const toggle = (e) => {
        e.stopPropagation();
        menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    };

    const close = (e) => {
        if (!menu.contains(e.target) && e.target !== trigger) {
            menu.style.display = 'none';
        }
    };

    trigger.addEventListener('click', toggle);
    window.addEventListener('click', close);
};

// --- USAGE ---

