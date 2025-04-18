"use client"

import type React from "react"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import {
  ChevronRight,
  Bell,
  HelpCircle,
  ChevronDown,
  Menu,
  ChevronLeft,
  FolderOpen,
  Settings,
  Library,
} from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"

interface MainLayoutProps {
  children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  const pathname = usePathname()
  const [isExpanded, setIsExpanded] = useState(true)

  const toggleSidebar = () => {
    setIsExpanded(!isExpanded)
  }

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <div
        className={cn(
          "bg-black text-white flex flex-col transition-all duration-300 ease-in-out relative",
          isExpanded ? "w-[168px]" : "w-[40px]",
        )}
      >
        {/* Toggle button */}
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-20 bg-black text-white rounded-full p-1 z-10 border border-gray-700"
          aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
        >
          {isExpanded ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>

        <div className="p-5 border-b border-gray-800 flex justify-center">
          <div className={cn("flex flex-col items-center", isExpanded ? "" : "w-6 overflow-hidden")}>
            <Image
              src="/jstor-logo-new.png"
              alt="JSTOR Logo"
              width={isExpanded ? 80 : 24}
              height={isExpanded ? 80 : 24}
              className="mb-1"
            />
            {/* Removed the text since the logo already includes "JSTOR" */}
          </div>
        </div>

        <nav className="flex-1 overflow-hidden">
          <ul className="py-2">
            <li
              className={cn(
                "py-2 flex items-center",
                pathname === "/" ? "bg-gray-900" : "",
                isExpanded ? "px-5" : "px-2 justify-center",
              )}
            >
              <Link
                href="/"
                className={cn("text-sm font-medium flex items-center", isExpanded ? "" : "w-6 overflow-hidden")}
              >
                <Menu size={16} className="mr-2 flex-shrink-0" />
                {isExpanded && <span>Home</span>}
              </Link>
            </li>
            <li className={cn("py-2 flex items-center justify-between", isExpanded ? "px-5" : "px-2 justify-center")}>
              <Link
                href="#"
                className={cn("text-sm font-medium flex items-center", isExpanded ? "" : "w-6 overflow-hidden")}
              >
                <FolderOpen size={16} className="mr-2 flex-shrink-0" />
                {isExpanded && <span>Projects</span>}
              </Link>
              {isExpanded && <ChevronDown size={16} />}
            </li>
            <li className={cn("py-2 flex items-center justify-between", isExpanded ? "px-5" : "px-2 justify-center")}>
              <Link
                href="#"
                className={cn("text-sm font-medium flex items-center", isExpanded ? "" : "w-6 overflow-hidden")}
              >
                <Settings size={16} className="mr-2 flex-shrink-0" />
                {isExpanded && <span>Admin</span>}
              </Link>
              {isExpanded && <ChevronDown size={16} />}
            </li>
            <li className={cn("py-2 flex items-center justify-between", isExpanded ? "px-5" : "px-2 justify-center")}>
              <Link
                href="#"
                className={cn("text-sm font-medium flex items-center", isExpanded ? "" : "w-6 overflow-hidden")}
              >
                <Library size={16} className="mr-2 flex-shrink-0" />
                {isExpanded && <span>Cataloging Tools</span>}
              </Link>
              {isExpanded && <ChevronDown size={16} />}
            </li>
          </ul>
        </nav>

        <div className={cn("border-t border-gray-800", isExpanded ? "" : "flex justify-center")}>
          <Link
            href="#"
            className={cn("py-4 flex items-center text-sm font-medium", isExpanded ? "px-5" : "px-2 justify-center")}
          >
            <HelpCircle size={16} className="mr-2 flex-shrink-0" />
            {isExpanded && (
              <>
                <span>Support</span>
                <ChevronRight size={16} className="ml-auto" />
              </>
            )}
          </Link>
        </div>

        {isExpanded && (
          <div className="p-4 text-xs text-gray-500 border-t border-gray-800">
            <div className="mb-1">Terms of Use | Copyright</div>
            <div className="mb-1">Privacy | Cookie Policy</div>
            <div className="mb-1">Cookie Settings</div>
            <div>2000 - 2025 ITHAKA, All Rights Reserved.</div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-auto">
        {/* Header */}
        <header className="flex justify-between items-center p-4 border-b">
          <div></div>
          <div className="flex items-center gap-4">
            <Bell size={20} className="text-gray-600" />
            <HelpCircle size={20} className="text-gray-600" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium">
                SA
              </div>
              <span className="text-sm">syed.amaanullah@ithaka.org</span>
            </div>
            <Link href="#" className="text-sm font-medium">
              Log Out
            </Link>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
