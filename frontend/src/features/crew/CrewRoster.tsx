import { useState } from "react";
import {
  User,
  MapPin,
  BadgeCheck,
  UserPlus,
  ArrowRightLeft,
  UserMinus,
  Shield,
  Wrench,
  Anchor as AnchorIcon,
  ChefHat,
  Users,
} from "lucide-react";
import type { CrewMember } from "../api/apiSlice";

interface CrewRosterProps {
  crew: CrewMember[];
  vesselName: string | null;
  onAssign?: (crewId: string) => void;
  onTransfer?: (crewId: string) => void;
  onRemove?: (crewId: string) => void;
}

type CrewGroup = "OFFICERS" | "DECK" | "ENGINE" | "SERVICE";

const roleGroupMap: Record<string, CrewGroup> = {
  CAPTAIN: "OFFICERS",
  FIRST_OFFICER: "OFFICERS",
  CHIEF_ENGINEER: "OFFICERS",
  DECKHAND: "DECK",
  ENGINEER: "ENGINE",
  COOK: "SERVICE",
};

const groupConfig = {
  OFFICERS: {
    label: "Command Officers",
    icon: Shield,
    textClass: "text-purple-400",
  },
  DECK: {
    label: "Deck Crew",
    icon: AnchorIcon,
    textClass: "text-blue-400",
  },
  ENGINE: {
    label: "Engine Room",
    icon: Wrench,
    textClass: "text-orange-400",
  },
  SERVICE: {
    label: "Service Staff",
    icon: ChefHat,
    textClass: "text-emerald-400",
  },
};

export const CrewRoster = ({
  crew,
  vesselName,
  onAssign,
  onTransfer,
  onRemove,
}: CrewRosterProps) => {
  const [expandedGroups, setExpandedGroups] = useState<Set<CrewGroup>>(
    new Set(["OFFICERS", "DECK", "ENGINE", "SERVICE"]),
  );

  const toggleGroup = (group: CrewGroup) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(group)) {
      newExpanded.delete(group);
    } else {
      newExpanded.add(group);
    }
    setExpandedGroups(newExpanded);
  };

  // Group crew by department
  const groupedCrew = crew.reduce(
    (acc, member) => {
      const group = roleGroupMap[member.role] || "DECK";
      if (!acc[group]) acc[group] = [];
      acc[group].push(member);
      return acc;
    },
    {} as Record<CrewGroup, CrewMember[]>,
  );

  const isUnassigned = vesselName === null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          {isUnassigned ? (
            <Users className="text-amber-400" size={20} />
          ) : (
            <User className="text-blue-400" size={20} />
          )}
          {isUnassigned ? "Shore Leave Personnel" : `${vesselName} Roster`}
        </h2>
        <p className="text-sm text-slate-500 mt-0.5">
          {crew.length} crew member{crew.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Empty State */}
      {crew.length === 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-12 text-center">
          <div className="p-4 bg-slate-800/50 rounded-lg inline-block mb-4">
            <User size={40} className="text-slate-600" />
          </div>
          <h3 className="text-base font-semibold text-slate-300 mb-1.5">
            No Crew Members
          </h3>
          <p className="text-slate-500 text-sm">
            {isUnassigned
              ? "All personnel are currently assigned to vessels"
              : "This vessel has no crew assigned"}
          </p>
        </div>
      )}

      {/* Grouped Crew List */}
      {Object.entries(groupedCrew).map(([groupKey, members]) => {
        const group = groupKey as CrewGroup;
        const config = groupConfig[group];
        const Icon = config.icon;
        const isExpanded = expandedGroups.has(group);

        return (
          <div
            key={group}
            className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden"
          >
            {/* Group Header */}
            <button
              onClick={() => toggleGroup(group)}
              className="w-full flex items-center justify-between px-4 py-3 transition-colors border-b border-slate-800 hover:bg-slate-800/50"
            >
              <div className="flex items-center gap-2.5">
                <Icon size={16} className={config.textClass} />
                <div className="text-left">
                  <h3 className="font-semibold text-white text-sm">
                    {config.label}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {members.length} member{members.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <div
                className={`transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="text-slate-500"
                >
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </button>

            {/* Group Members */}
            {isExpanded && (
              <div className="divide-y divide-slate-800">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="p-4 hover:bg-slate-800/30 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      {/* Left: Member Info */}
                      <div className="flex items-center gap-3.5 flex-1">
                        <div className="w-9 h-9 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center text-slate-300 text-sm font-semibold shrink-0">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-white text-sm">
                              {member.name}
                            </h4>
                            {member.status === "ACTIVE" && (
                              <BadgeCheck
                                size={14}
                                className="text-emerald-400"
                              />
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded">
                              {member.license_number}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded font-medium ${getRoleBadgeColor(member.role)}`}
                            >
                              {member.role.replace("_", " ")}
                            </span>
                            <span className="flex items-center gap-1 text-slate-500">
                              <MapPin size={11} />
                              {member.nationality}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex gap-1.5">
                        {isUnassigned && onAssign && (
                          <button
                            onClick={() => onAssign(member.id)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md font-medium transition-colors text-xs"
                            title="Assign to Vessel"
                          >
                            <UserPlus size={13} />
                            Assign
                          </button>
                        )}
                        {!isUnassigned && onTransfer && (
                          <button
                            onClick={() => onTransfer(member.id)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 text-slate-300 rounded-md font-medium hover:bg-slate-700 transition-colors text-xs"
                            title="Transfer to Another Vessel"
                          >
                            <ArrowRightLeft size={13} />
                            Transfer
                          </button>
                        )}
                        {!isUnassigned && onRemove && (
                          <button
                            onClick={() => onRemove(member.id)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 text-red-400 rounded-md font-medium hover:bg-red-500/15 transition-colors text-xs"
                            title="Remove from Vessel"
                          >
                            <UserMinus size={13} />
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// Helper function for role badge colors
function getRoleBadgeColor(role: string): string {
  const colors: Record<string, string> = {
    CAPTAIN: "bg-purple-500/10 text-purple-400",
    FIRST_OFFICER: "bg-blue-500/10 text-blue-400",
    CHIEF_ENGINEER: "bg-orange-500/10 text-orange-400",
    DECKHAND: "bg-slate-800 text-slate-400",
    ENGINEER: "bg-orange-500/10 text-orange-400",
    COOK: "bg-emerald-500/10 text-emerald-400",
  };
  return colors[role] || "bg-slate-800 text-slate-400";
}
