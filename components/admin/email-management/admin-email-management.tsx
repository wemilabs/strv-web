"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle,
  Clock,
  Download,
  Eye,
  FileText,
  Mail,
  Paperclip,
  RefreshCw,
  Search,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import Image from "next/image";
import { parseAsStringLiteral, useQueryStates } from "nuqs";
import { Activity, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn, formatDateShort, formatRelativeTime } from "@/lib/utils";
import {
  deleteReceivedEmail,
  getEmailStats,
  getReceivedEmails,
} from "@/server/admin/emails";

interface Email {
  id: string;
  emailId: string;
  from: string;
  to: string[];
  subject: string | null;
  textBody?: string | null;
  htmlBody?: string | null;
  status: "received" | "processed" | "failed";
  createdAt: Date;
  attachments?: Array<{
    id: string;
    filename: string;
    contentType: string;
    size: number | null;
    fileKey: string | null;
  }>;
}

interface AttachmentPreviewProps {
  attachment: {
    id: string;
    filename: string;
    contentType: string;
    size: number | null;
    fileKey: string | null;
  };
  isImage: boolean;
  isPdf: boolean;
}

function AttachmentPreview({
  attachment,
  isImage,
  isPdf,
}: AttachmentPreviewProps) {
  const {
    data: previewUrl,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["attachment-preview", attachment.id],
    queryFn: async () => {
      const { getEmailAttachmentUrl } = await import("@/server/admin/emails");
      return getEmailAttachmentUrl(attachment.id);
    },
    staleTime: 1000 * 60 * 5,
  });

  const renderPreview = () => {
    if (isLoading)
      return (
        <div className="aspect-video flex items-center justify-center bg-muted/50">
          <Spinner className="size-8 text-muted-foreground" />
        </div>
      );

    if (isError || !previewUrl)
      return (
        <div className="aspect-video flex items-center justify-center bg-muted/50">
          <Paperclip className="size-12 text-muted-foreground" />
        </div>
      );

    if (isImage)
      return (
        <div className="aspect-video relative">
          <Image
            src={previewUrl}
            alt={attachment.filename || "Attachment"}
            fill
            sizes="(max-width: 768px) 50vw, 200px"
            className="object-cover"
          />
        </div>
      );

    if (isPdf)
      return (
        <div className="aspect-video relative overflow-hidden">
          <iframe
            src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
            title={attachment.filename || "PDF Preview"}
            className="w-full h-full border-0 pointer-events-none"
            style={{ transform: "scale(1)", transformOrigin: "top left" }}
          />
        </div>
      );

    return (
      <div className="aspect-video flex items-center justify-center bg-muted/50">
        <FileText className="size-12 text-muted-foreground" />
      </div>
    );
  };

  return (
    <div className="group relative border rounded-lg overflow-hidden bg-muted/30">
      {renderPreview()}
      <div className="p-2 space-y-1">
        <p
          className="text-xs font-medium truncate"
          title={attachment.filename || "Attachment"}
        >
          {attachment.filename}
        </p>
        <p className="text-xs text-muted-foreground font-mono">
          {((attachment.size ?? 0) / 1024).toFixed(1)} KB
        </p>
      </div>
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={async () => {
            try {
              if (previewUrl) {
                window.open(previewUrl, "_blank");
              }
            } catch (error) {
              console.error("Failed to open attachment:", error);
            }
          }}
        >
          <Eye className="size-4" />
          View
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={async () => {
            try {
              if (previewUrl) {
                const response = await fetch(previewUrl);
                const blob = await response.blob();
                const blobUrl = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = blobUrl;
                a.download = attachment.filename || "attachment";
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(blobUrl);
              }
            } catch (error) {
              console.error("Failed to download attachment:", error);
              toast.error("Failed to download attachment");
            }
          }}
        >
          <Download className="size-4" />
          Save
        </Button>
      </div>
    </div>
  );
}

interface EmailStatsCard {
  emailStatsTitle: string;
  emailStatsIcon: React.ReactNode;
  emailStatsAddClassName?: string;
  emailStatsQty: number;
}

const statusOptions = ["all", "received", "processed", "failed"] as const;

export function AdminEmailManagement() {
  const queryClient = useQueryClient();
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();

  const [{ search, status }, setFilters] = useQueryStates(
    {
      search: { defaultValue: "", parse: v => v || "" },
      status: parseAsStringLiteral(statusOptions).withDefault("all"),
    },
    {
      shallow: true,
      throttleMs: 300,
    },
  );

  const {
    data: emails = [],
    isLoading: emailsLoading,
    refetch: refetchEmails,
  } = useQuery({
    queryKey: ["admin-emails", search, status],
    queryFn: () =>
      getReceivedEmails({
        search: search || undefined,
        status: status === "all" ? undefined : status,
      }),
  });

  const {
    data: stats = {
      total: 0,
      received: 0,
      processed: 0,
      failed: 0,
    },
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ["admin-email-stats"],
    queryFn: () => getEmailStats(),
  });

  const handleDeleteEmail = () => {
    if (!selectedEmail) return;
    startDeleteTransition(async () => {
      try {
        await deleteReceivedEmail(selectedEmail.emailId);
        toast.success("Email deleted successfully", {
          description:
            "This email and all associated data have been cleaned up from the storage",
        });
        queryClient.invalidateQueries({ queryKey: ["admin-emails"] });
        queryClient.invalidateQueries({ queryKey: ["admin-email-stats"] });
        setSelectedEmail(null);
        setDeleteDialogOpen(false);
      } catch (error) {
        console.error("Failed to delete email:", error);
        toast.error("Failed to delete email");
      }
    });
  };

  const refreshData = () => {
    refetchEmails();
    refetchStats();
  };

  const isLoading = emailsLoading || statsLoading;

  const statsCardData: EmailStatsCard[] = [
    {
      emailStatsTitle: "Total Emails",
      emailStatsIcon: <Mail className="size-4 text-muted-foreground" />,
      emailStatsQty: stats.total,
    },
    {
      emailStatsTitle: "Today's",
      emailStatsIcon: <Clock className="size-4 text-muted-foreground" />,
      emailStatsQty: stats.received,
    },
    {
      emailStatsTitle: "Processed",
      emailStatsIcon: <CheckCircle className="size-4 text-muted-foreground" />,
      emailStatsAddClassName: "text-green-600",
      emailStatsQty: stats.processed,
    },
    {
      emailStatsTitle: "Failed",
      emailStatsIcon: <XCircle className="size-4 text-muted-foreground" />,
      emailStatsAddClassName: "text-red-600",
      emailStatsQty: stats.failed,
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "processed":
        return <CheckCircle className="size-4 text-green-500" />;
      case "failed":
        return <XCircle className="size-4 text-red-500" />;
      default:
        return <Clock className="size-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "processed":
        return "available";
      case "failed":
        return "destructive";
      default:
        return "secondary";
    }
  };

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg">Email Management</h2>
        <Button variant="outline" onClick={refreshData} disabled={isLoading}>
          <RefreshCw className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsCardData.map(
          ({
            emailStatsTitle,
            emailStatsIcon,
            emailStatsAddClassName,
            emailStatsQty,
          }) => (
            <Card key={emailStatsTitle}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {emailStatsTitle}
                </CardTitle>
                {emailStatsIcon}
              </CardHeader>
              <CardContent>
                <div
                  className={cn(
                    emailStatsAddClassName,
                    "text-2xl font-bold font-mono tracking-tighter",
                  )}
                >
                  {emailStatsQty}
                </div>
              </CardContent>
            </Card>
          ),
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-[400px_1fr]">
        {/* Email List */}
        <Card>
          <CardHeader>
            <CardTitle>Inbox</CardTitle>
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search emails..."
                  value={search}
                  onChange={e => setFilters({ search: e.target.value })}
                  className="pl-8 placeholder:text-sm text-sm"
                />
                <Activity mode={search ? "visible" : "hidden"}>
                  <button
                    type="button"
                    onClick={() => setFilters({ search: "" })}
                    className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                </Activity>
              </div>
              <Tabs
                value={status}
                onValueChange={value =>
                  setFilters({
                    status: value as
                      | "all"
                      | "received"
                      | "processed"
                      | "failed",
                  })
                }
              >
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="received">New</TabsTrigger>
                  <TabsTrigger value="processed">Done</TabsTrigger>
                  <TabsTrigger value="failed">Failed</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              <div className="space-y-2">
                {isLoading ? (
                  <div className="flex justify-center p-4">
                    <RefreshCw className="size-4 animate-spin" />
                    <span className="ml-2 text-sm text-muted-foreground font-mono tracking-tighter">
                      Loading emails...
                    </span>
                  </div>
                ) : emails.length === 0 ? (
                  <Empty className="border-none p-0">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <Mail className="size-6" />
                      </EmptyMedia>
                      <EmptyTitle>No emails found</EmptyTitle>
                      <EmptyDescription className="font-mono tracking-tighter text-sm">
                        No emails match your current filters
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                ) : (
                  emails.map(email => (
                    <button
                      type="button"
                      key={email.id}
                      className={`w-full text-left p-3 rounded-lg border cursor-pointer transition-colors hover:bg-accent ${
                        selectedEmail?.id === email.id ? "bg-accent" : ""
                      }`}
                      onClick={() => setSelectedEmail(email)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {getStatusIcon(email.status)}
                            <p className="text-sm font-medium truncate">
                              {email.from}
                            </p>
                          </div>
                          <p className="text-sm font-medium truncate">
                            {email.subject || "No Subject"}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono tracking-tighter">
                            {formatRelativeTime(new Date(email.createdAt))}
                          </p>
                        </div>
                        {email.attachments && email.attachments.length > 0 && (
                          <Paperclip className="size-4 text-muted-foreground ml-2" />
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Email Detail */}
        <Card>
          <CardHeader>
            {selectedEmail ? (
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-xl">
                    {selectedEmail.subject || "No Subject"}
                  </CardTitle>
                  <CardDescription className="font-mono tracking-tighter">
                    From: {selectedEmail.from} •{" "}
                    {formatDateShort(selectedEmail.createdAt)}
                  </CardDescription>
                  <Badge variant={getStatusColor(selectedEmail.status)}>
                    {selectedEmail.status}
                  </Badge>
                </div>
                <AlertDialog
                  open={deleteDialogOpen}
                  onOpenChange={setDeleteDialogOpen}
                >
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" disabled={isDeleting}>
                      <Trash2 className="size-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Absolutely sure about deleting this email?
                      </AlertDialogTitle>
                      <AlertDialogDescription className="font-mono tracking-tighter text-sm">
                        This action cannot be undone. It will permanently delete
                        this email and all associated data.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={e => {
                          e.preventDefault();
                          handleDeleteEmail();
                        }}
                        disabled={isDeleting}
                        className="bg-destructive hover:bg-destructive/80"
                      >
                        {isDeleting ? (
                          <div className="flex items-center gap-2">
                            <Spinner />
                            Deleting...
                          </div>
                        ) : (
                          "Delete"
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ) : (
              <div className="text-center text-muted-foreground font-mono text-sm tracking-tighter">
                Select an email to view details
              </div>
            )}
          </CardHeader>
          <CardContent>
            {selectedEmail ? (
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">To:</h4>
                  <p className="text-sm text-muted-foreground font-mono tracking-tighter">
                    {selectedEmail.to.join(", ")}
                  </p>
                </div>

                {selectedEmail.attachments &&
                  selectedEmail.attachments.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Attachments:</h4>
                      <div className="grid grid-cols-2 gap-3">
                        {selectedEmail.attachments.map(attachment => {
                          const isImage =
                            attachment.contentType?.startsWith("image/");
                          const isPdf =
                            attachment.contentType === "application/pdf";

                          return (
                            <AttachmentPreview
                              key={attachment.id}
                              attachment={attachment}
                              isImage={isImage}
                              isPdf={isPdf}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}

                <div>
                  <h4 className="text-sm font-medium mb-2">Message:</h4>
                  {selectedEmail.htmlBody ? (
                    <iframe
                      srcDoc={selectedEmail.htmlBody}
                      className="w-full h-96 border rounded"
                      title="Email content"
                      sandbox="allow-same-origin"
                    />
                  ) : (
                    <pre className="whitespace-pre-wrap text-sm">
                      {selectedEmail.textBody}
                    </pre>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-96 text-muted-foreground">
                <Mail className="size-12" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
