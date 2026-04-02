import { slides } from "@/data/slides";
import { getGeneratedSlides } from "@/data/generated-slides";
import Sidebar from "./Sidebar";

export default function SidebarServer() {
  const generated = getGeneratedSlides();
  return <Sidebar templates={slides} generated={generated} />;
}
