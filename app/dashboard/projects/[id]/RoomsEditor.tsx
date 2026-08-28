"use client";

import { useState } from "react";
import { addRoom, removeRoom, addGuest, removeGuest } from "./actions";

type RoomTypeOption = {
  id: string;
  name: string;
  capacity: number;
  priceLabel: string;
};

type HotelOption = {
  supplierId: string;
  supplierName: string;
  roomTypes: RoomTypeOption[];
};

type Guest = {
  id: string;
  fullName: string;
  email: string | null;
  mobile: string | null;
  allergies: string | null;
};

type Room = {
  id: string;
  supplierName: string;
  roomTypeLabel: string;
  guests: Guest[];
};

function AddGuestForm({
  projectId,
  roomId,
  onAdded,
}: {
  projectId: string;
  roomId: string;
  onAdded: (guest: Guest) => void;
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [allergies, setAllergies] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const { id } = await addGuest(projectId, roomId, {
        fullName,
        email: email || null,
        mobile: mobile || null,
        allergies: allergies || null,
      });
      onAdded({
        id,
        fullName,
        email: email || null,
        mobile: mobile || null,
        allergies: allergies || null,
      });
      setFullName("");
      setEmail("");
      setMobile("");
      setAllergies("");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
      <input
        type="text"
        required
        placeholder="Guest full name"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        className="rounded-card border border-line px-3 py-1.5 text-sm text-ink outline-none focus-visible:border-wine"
      />
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="rounded-card border border-line px-3 py-1.5 text-sm text-ink outline-none focus-visible:border-wine"
      />
      <input
        type="tel"
        placeholder="Mobile"
        value={mobile}
        onChange={(e) => setMobile(e.target.value)}
        className="rounded-card border border-line px-3 py-1.5 text-sm text-ink outline-none focus-visible:border-wine"
      />
      <input
        type="text"
        placeholder="Allergies (optional)"
        value={allergies}
        onChange={(e) => setAllergies(e.target.value)}
        className="rounded-card border border-line px-3 py-1.5 text-sm text-ink outline-none focus-visible:border-wine"
      />
      {message && <p className="text-xs text-wine sm:col-span-2">{message}</p>}
      <button
        type="submit"
        disabled={loading}
        className="rounded-card border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink transition hover:border-wine disabled:opacity-60 sm:col-span-2"
      >
        {loading ? "Adding…" : "+ Add guest"}
      </button>
    </form>
  );
}

export function RoomsEditor({
  projectId,
  hotelOptions,
  initialRooms,
  readOnly,
}: {
  projectId: string;
  hotelOptions: HotelOption[];
  initialRooms: Room[];
  readOnly: boolean;
}) {
  const [rooms, setRooms] = useState(initialRooms);
  const [selectedKey, setSelectedKey] = useState(
    hotelOptions[0]?.roomTypes[0] ? `${hotelOptions[0].supplierId}:${hotelOptions[0].roomTypes[0].id}` : ""
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function handleAddRoom() {
    const [supplierId, roomTypeId] = selectedKey.split(":");
    const hotel = hotelOptions.find((h) => h.supplierId === supplierId);
    const roomType = hotel?.roomTypes.find((r) => r.id === roomTypeId);
    if (!hotel || !roomType) return;

    setLoading(true);
    setMessage(null);
    try {
      const { id } = await addRoom(projectId, {
        supplierId,
        hotelRoomTypeId: roomTypeId,
        roomTypeLabel: roomType.name,
      });
      setRooms((prev) => [
        ...prev,
        { id, supplierName: hotel.supplierName, roomTypeLabel: roomType.name, guests: [] },
      ]);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveRoom(roomId: string) {
    setRemovingId(roomId);
    try {
      await removeRoom(projectId, roomId);
      setRooms((prev) => prev.filter((r) => r.id !== roomId));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setRemovingId(null);
    }
  }

  if (hotelOptions.length === 0) {
    return (
      <p className="text-sm text-ink/60">
        No hotel is linked to this booking, so rooms can&apos;t be tracked here.
      </p>
    );
  }

  return (
    <div>
      {rooms.length === 0 ? (
        <p className="text-sm text-ink/60">No rooms added yet.</p>
      ) : (
        <ul className="space-y-3">
          {rooms.map((room) => (
            <li key={room.id} className="rounded-card border border-line bg-white p-4">
              <div className="flex items-start justify-between">
                <p className="font-semibold text-ink">
                  {room.roomTypeLabel}
                  <span className="ml-2 text-xs font-normal text-ink/50">{room.supplierName}</span>
                </p>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => handleRemoveRoom(room.id)}
                    disabled={removingId === room.id}
                    className="text-xs font-semibold text-wine disabled:opacity-60"
                  >
                    {removingId === room.id ? "Removing…" : "Remove room"}
                  </button>
                )}
              </div>

              {room.guests.length > 0 && (
                <ul className="mt-2 space-y-1.5">
                  {room.guests.map((g) => (
                    <li key={g.id} className="flex items-center justify-between text-sm">
                      <span className="text-ink/80">
                        {g.fullName}
                        {g.email ? ` · ${g.email}` : ""}
                        {g.mobile ? ` · ${g.mobile}` : ""}
                        {g.allergies ? ` · Allergies: ${g.allergies}` : ""}
                      </span>
                      {!readOnly && (
                        <button
                          type="button"
                          onClick={async () => {
                            await removeGuest(projectId, g.id);
                            setRooms((prev) =>
                              prev.map((r) =>
                                r.id === room.id
                                  ? { ...r, guests: r.guests.filter((x) => x.id !== g.id) }
                                  : r
                              )
                            );
                          }}
                          className="text-xs font-semibold text-wine"
                        >
                          Remove
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {!readOnly && (
                <AddGuestForm
                  projectId={projectId}
                  roomId={room.id}
                  onAdded={(guest) =>
                    setRooms((prev) =>
                      prev.map((r) =>
                        r.id === room.id ? { ...r, guests: [...r.guests, guest] } : r
                      )
                    )
                  }
                />
              )}
            </li>
          ))}
        </ul>
      )}

      {!readOnly && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <select
            value={selectedKey}
            onChange={(e) => setSelectedKey(e.target.value)}
            className="rounded-card border border-line px-3 py-2 text-sm text-ink outline-none focus-visible:border-wine"
          >
            {hotelOptions.map((hotel) =>
              hotel.roomTypes.map((rt) => (
                <option key={`${hotel.supplierId}:${rt.id}`} value={`${hotel.supplierId}:${rt.id}`}>
                  {hotel.supplierName} — {rt.name} (sleeps {rt.capacity}, {rt.priceLabel})
                </option>
              ))
            )}
          </select>
          <button
            type="button"
            onClick={handleAddRoom}
            disabled={loading || !selectedKey}
            className="rounded-card border border-line bg-white px-3 py-2 text-sm font-semibold text-ink transition hover:border-wine disabled:opacity-60"
          >
            {loading ? "Adding…" : "+ Add room"}
          </button>
        </div>
      )}
      {message && <p className="mt-2 text-sm text-wine">{message}</p>}
    </div>
  );
}
