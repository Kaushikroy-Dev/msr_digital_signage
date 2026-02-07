import { Bell, Search } from 'lucide-react';
import './Header.css';

export default function Header() {
    return (
        <header className="header">
            <div className="header-search">
                <Search size={18} />
                <input
                    type="text"
                    placeholder="Search..."
                    className="header-search-input"
                />
            </div>

            <div className="header-actions">
                <button className="header-icon-btn">
                    <Bell size={20} />
                    <span className="header-badge">3</span>
                </button>
            </div>
        </header>
    );
}
