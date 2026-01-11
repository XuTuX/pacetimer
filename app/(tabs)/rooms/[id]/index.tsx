import { Redirect, useLocalSearchParams } from "expo-router";
import React from "react";

export default function RedirectToNewRoom() {
    const { id } = useLocalSearchParams();
    const roomId = Array.isArray(id) ? id[0] : id;

    return <Redirect href={`/room/${roomId}`} />;
}
