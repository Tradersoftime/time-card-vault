async function submitRedemption() {
  setMsg(null);
  const chosen = Object.keys(selected).filter((id) => selected[id]);
  if (chosen.length === 0) {
    setMsg("Select at least one card.");
    return;
  }

  // Get user id
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) {
    setMsg("Not signed in.");
    return;
  }

  // 1) Create a redemption row for this user
  const { data: redRow, error: redErr } = await supabase
    .from("redemptions")
    .insert({ user_id: userData.user.id }) // RLS requires this equals auth.uid()
    .select("id")
    .single();

  if (redErr || !redRow?.id) {
    setMsg(redErr?.message || "Could not create redemption.");
    return;
  }

  // 2) Attach selected cards. Ignore duplicates globally (card already submitted/credited).
  const payload = chosen.map((card_id) => ({ redemption_id: redRow.id, card_id }));

  // `onConflict: 'card_id'` + `ignoreDuplicates: true` means:
  //   - If a card is already in ANY redemption, it will be skipped silently.
  // We then .select() to see how many actually got added.
  const { data: inserted, error: linkErr } = await supabase
    .from("redemption_cards")
    .insert(payload, { onConflict: "card_id", ignoreDuplicates: true })
    .select("card_id");

  if (linkErr) {
    // Friendly fallback if something else went wrong
    if ((linkErr as any).code === "23505" || /duplicate key/i.test(linkErr.message)) {
      setMsg("⚠️ Already submitted or redeemed.");
    } else {
      setMsg(linkErr.message);
    }
    return;
  }

  const addedCount = inserted?.length ?? 0;

  if (addedCount === 0) {
    setMsg("⚠️ Already submitted or redeemed.");
    return;
  }

  setMsg(`✅ Submitted ${addedCount} card${addedCount === 1 ? "" : "s"} for TIME review!`);
}
