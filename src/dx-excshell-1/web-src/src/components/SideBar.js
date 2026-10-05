/* 
* <license header>
*/

import React from 'react'
import { NavLink } from 'react-router-dom'

function SideBar () {
    return (
        <ul className="SideNav">
            <li className="SideNav-item">
                <NavLink
                    className={({ isActive }) => `SideNav-itemLink ${isActive ? 'is-selected' : ''}`}
                    aria-current="page"
                    end
                    to="/"
                >
                    Home
                </NavLink>
            </li>
            <li className="SideNav-item">
                <NavLink
                    className={({ isActive }) => `SideNav-itemLink ${isActive ? 'is-selected' : ''}`}
                    aria-current="page"
                    to="/actions"
                >
                    Your App Actions
                </NavLink>
            </li>
            <li className="SideNav-item">
                <NavLink
                    className={({ isActive }) => `SideNav-itemLink ${isActive ? 'is-selected' : ''}`}
                    aria-current="page"
                    to="/analytics"
                >
                    Analytics Dashboard
                </NavLink>
            </li>
            <li className="SideNav-item">
                <NavLink
                    className={({ isActive }) => `SideNav-itemLink ${isActive ? 'is-selected' : ''}`}
                    aria-current="page"
                    to="/analytics-buttons"
                >
                    Analytics Dashboard Buttons
                </NavLink>
            </li>
            <li className="SideNav-item">
                <NavLink
                    className={({ isActive }) => `SideNav-itemLink ${isActive ? 'is-selected' : ''}`}
                    aria-current="page"
                    to="/files"
                >
                    Files
                </NavLink>
            </li>
            <li className="SideNav-item">
                <NavLink
                    className={({ isActive }) => `SideNav-itemLink ${isActive ? 'is-selected' : ''}`}
                    aria-current="page"
                    to="/files-quick-delete"
                >
                    Files (Quick Delete)
                </NavLink>
            </li>
            <li className="SideNav-item">
                <NavLink
                    className={({ isActive }) => `SideNav-itemLink ${isActive ? 'is-selected' : ''}`}
                    aria-current="page"
                    to="/about"
                >
                    About App Builder
                </NavLink>
            </li>
        </ul>
    )
}

export default SideBar
