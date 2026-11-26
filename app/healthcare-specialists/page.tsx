import type { Metadata } from "next";
import Team from "@/components/Team";

export const metadata: Metadata = {
  title: "Jajaran Healthcare Specialists – INTRAMEDIKA",
};

export default function HealthcareSpecialistsPage() {
  return <Team team="healthcare" />;
}
