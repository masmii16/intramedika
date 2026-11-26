import type { Metadata } from "next";
import Team from "@/components/Team";

export const metadata: Metadata = {
  title: "Jajaran Manajemen – INTRAMEDIKA",
};

export default function JajaranManajemenPage() {
  return <Team team="manajemen" />;
}
