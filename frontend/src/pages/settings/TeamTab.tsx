import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Loader2, MoreHorizontal, Plus, UserX } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DataTable, type DataTableColumn } from "@/components/ui/data-table"
import { EmptyState } from "@/components/ui/empty-state"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { InviteMemberSlideOver } from "@/components/settings/InviteMemberSlideOver"
import { useAuth } from "@/contexts/AuthContext"
import { formatDate } from "@/lib/format"
import {
  ApiError,
  getTeam,
  updateMemberRole,
  removeMember,
  revokeInvite,
  type TeamMember,
} from "@/lib/api"

function TeamTab() {
  const { state } = useAuth()
  const isOwner = state.status === "authenticated" && state.role === "OWNER"
  const currentUserEmail = state.status === "authenticated" ? state.user.email : null

  const [members, setMembers] = useState<TeamMember[] | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<TeamMember | null>(null)
  const [removing, setRemoving] = useState(false)

  function load() {
    getTeam().then(setMembers)
  }

  useEffect(load, [])

  async function handleRoleChange(member: TeamMember, role: "OWNER" | "STAFF") {
    try {
      await updateMemberRole(member.id, role)
      toast.success(`${member.name} is now ${role === "OWNER" ? "an Owner" : "Staff"}`)
      load()
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't change role")
    }
  }

  async function handleRemoveConfirm() {
    if (!removeTarget) return
    setRemoving(true)
    try {
      if (removeTarget.kind === "INVITE") {
        await revokeInvite(removeTarget.id)
        toast.success("Invite revoked")
      } else {
        await removeMember(removeTarget.id)
        toast.success(`${removeTarget.name} was removed`)
      }
      setRemoveTarget(null)
      load()
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't remove")
    } finally {
      setRemoving(false)
    }
  }

  if (!members) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const columns: DataTableColumn<TeamMember>[] = [
    {
      key: "name",
      header: "Name",
      render: (m) => (
        <span className="font-medium text-foreground">
          {m.name ?? <span className="text-muted-foreground italic">Pending</span>}
        </span>
      ),
    },
    { key: "email", header: "Email", accessor: (m) => m.email },
    {
      key: "role",
      header: "Role",
      render: (m) => <Badge variant={m.role === "OWNER" ? "default" : "secondary"}>{m.role === "OWNER" ? "Owner" : "Staff"}</Badge>,
    },
    {
      key: "status",
      header: "Status",
      render: (m) => (
        <Badge variant={m.status === "ACTIVE" ? "success" : "warning"}>
          {m.status === "ACTIVE" ? "Active" : "Invited"}
        </Badge>
      ),
    },
    {
      key: "joinedAt",
      header: "Since",
      render: (m) => <span className="text-muted-foreground">{formatDate(m.joinedAt)}</span>,
    },
  ]

  if (isOwner) {
    columns.push({
      key: "actions",
      header: "",
      render: (m) => {
        const isSelf = m.email === currentUserEmail
        if (isSelf) return null
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {m.kind === "MEMBER" ? (
                <>
                  {m.role === "STAFF" ? (
                    <DropdownMenuItem onClick={() => handleRoleChange(m, "OWNER")}>
                      Make owner
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => handleRoleChange(m, "STAFF")}>
                      Make staff
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem variant="destructive" onClick={() => setRemoveTarget(m)}>
                    Remove
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem variant="destructive" onClick={() => setRemoveTarget(m)}>
                  Revoke invite
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
      className: "w-12",
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {members.length} {members.length === 1 ? "person" : "people"} on your team
        </p>
        {isOwner && (
          <Button onClick={() => setInviteOpen(true)}>
            <Plus className="size-4" />
            Invite member
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={members}
        keyField={(m) => m.id}
        emptyState={
          <EmptyState icon={UserX} title="No team members yet" description="Invite someone to get started." />
        }
      />

      {isOwner && (
        <InviteMemberSlideOver
          open={inviteOpen}
          onOpenChange={setInviteOpen}
          onInvited={() => load()}
        />
      )}

      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
        title={removeTarget?.kind === "INVITE" ? "Revoke invite?" : "Remove member?"}
        description={
          removeTarget?.kind === "INVITE"
            ? `${removeTarget.email} won't be able to use this invite link anymore.`
            : `${removeTarget?.name} will lose access to this business immediately.`
        }
        confirmLabel={removeTarget?.kind === "INVITE" ? "Revoke" : "Remove"}
        variant="destructive"
        loading={removing}
        onConfirm={handleRemoveConfirm}
      />
    </div>
  )
}

export { TeamTab }
