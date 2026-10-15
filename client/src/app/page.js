"use client"; 
import Link from 'next/link';
import HeroAndNavbar from '../components/home/HeroAndNavbar';
import PilotAnnouncement from '../components/home/PilotAnnouncement';
import "./globals.css";

export default function Home() {
  return (
    <>
      <HeroAndNavbar />
      <PilotAnnouncement />
    </>
  );
}