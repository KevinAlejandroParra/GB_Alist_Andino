"use client"; 
import Link from 'next/link';
import HeroAndNavbar from '../components/home/HeroAndNavbar';
import PremisesWithInspectablesCarousel from '../components/home/PremisesWithInspectablesCarousel'; 
import "./globals.css";

export default function Home() {
  return (
    <>
      <HeroAndNavbar />
      <PremisesWithInspectablesCarousel /> 
    </>
  );
}