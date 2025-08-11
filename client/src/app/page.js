"use client"; 
import Link from 'next/link';
import { AuthProvider } from '../components/AuthContext';
import HeroAndNavbar from '../components/home/HeroAndNavbar';
import "./globals.css";

export default function Home() {
  return (
    <AuthProvider>
<HeroAndNavbar />
    </AuthProvider>
  );
}