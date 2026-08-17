"use client";

import { usePathname, useRouter } from "next/navigation";

import { SignUpForm } from "@/components/forms/signup-form";
import { Logo } from "@/components/logo";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function SignUpModal() {
  const router = useRouter();
  const pathname = usePathname();

  const isOpen = pathname === "/sign-up";

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && router.back()}>
      <DialogContent
        className="sm:max-w-[425px] z-70"
        aria-describedby={undefined}
      >
        <DialogHeader className="hidden">
          <DialogTitle className="self-center">
            <Logo />
          </DialogTitle>
        </DialogHeader>
        <SignUpForm />
      </DialogContent>
    </Dialog>
  );
}
