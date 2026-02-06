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
    color: "purple",
    bgClass: "bg-purple-500/10",
    textClass: "text-purple-400",
    borderClass: "border-purple-500/30",
  },
  DECK: {
    label: "Deck Crew",
    icon: AnchorIcon,
    color: "blue",
    bgClass: "bg-blue-500/10",
    textClass: "text-blue-400",
    borderClass: "border-blue-500/30",
  },
  ENGINE: {
    label: "Engine Room",
    icon: Wrench,
    color: "orange",
    bgClass: "bg-orange-500/10",
    textClass: "text-orange-400",
    borderClass: "border-orange-500/30",
  },
  SERVICE: {
    label: "Service Staff",
    icon: ChefHat,
    color: "green",
    bgClass: "bg-green-500/10",
    textClass: "text-green-400",
    borderClass: "border-green-500/30",
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            {isUnassigned ? (
              <Users className="text-amber-400" size={28} />
            ) : (
              <User className="text-blue-400" size={28} />
            )}
            {isUnassigned ? "Shore Leave Personnel" : `${vesselName} Roster`}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {crew.length} crew member{crew.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Empty State */}
      {crew.length === 0 && (
        <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-800 p-12 text-center">
          <div className="p-4 bg-slate-800/50 rounded-2xl inline-block mb-4">
            <User size={48} className="text-slate-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-300 mb-2">
            No Crew Members
          </h3>
          <p className="text-slate-500">
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
            className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-800 overflow-hidden shadow-xl"
          >
            {/* Group Header */}
            <button
              onClick={() => toggleGroup(group)}
              className={`w-full flex items-center justify-between p-4 transition-colors ${config.bgClass} border-b ${config.borderClass} hover:brightness-110`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 ${config.bgClass} rounded-lg`}>
                  <Icon size={20} className={config.textClass} />
                </div>
                <div className="text-left">
                  <h3 className={`font-bold ${config.textClass}`}>
                    {config.label}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {members.length} member{members.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <div
                className={`transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className={config.textClass}
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
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-lg">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-bold text-white">
                              {member.name}
                            </h4>
                            {member.status === "ACTIVE" && (
                              <BadgeCheck
                                size={16}
                                className="text-green-400"
                              />
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs">
                            <span className="px-2 py-1 bg-slate-800 text-slate-300 rounded font-mono">
                              {member.license_number}
                            </span>
                            <span
                              className={`px-2 py-1 rounded font-medium ${getRoleBadgeColor(member.role)}`}
                            >
                              {member.role.replace("_", " ")}
                            </span>
                            <span className="flex items-center gap-1 text-slate-400">
                              <MapPin size={12} />
                              {member.nationality}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex gap-2">
                        {isUnassigned && onAssign && (
                          <button
                            onClick={() => onAssign(member.id)}
                            className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300 text-xs"
                            title="Assign to Vessel"
                          >
                            <UserPlus size={14} />
                            Assign
                          </button>
                        )}
                        {!isUnassigned && onTransfer && (
                          <button
                            onClick={() => onTransfer(member.id)}
                            className="flex items-center gap-2 px-3 py-2 bg-slate-700 text-slate-300 rounded-lg font-semibold hover:bg-slate-600 transition-all duration-300 text-xs"
                            title="Transfer to Another Vessel"
                          >
                            <ArrowRightLeft size={14} />
                            Transfer
                          </button>
                        )}
                        {!isUnassigned && onRemove && (
                          <button
                            onClick={() => onRemove(member.id)}
                            className="flex items-center gap-2 px-3 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg font-semibold hover:bg-red-500/30 transition-all duration-300 text-xs"
                            title="Remove from Vessel"
                          >
                            <UserMinus size={14} />
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
    CAPTAIN: "bg-purple-500/20 text-purple-300 border border-purple-500/30",
    FIRST_OFFICER: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
    CHIEF_ENGINEER:
      "bg-orange-500/20 text-orange-300 border border-orange-500/30",
    DECKHAND: "bg-slate-700 text-slate-300 border border-slate-600",
    ENGINEER: "bg-orange-500/20 text-orange-300 border border-orange-500/30",
    COOK: "bg-green-500/20 text-green-300 border border-green-500/30",
  };
  return colors[role] || "bg-slate-700 text-slate-300 border border-slate-600";
}
