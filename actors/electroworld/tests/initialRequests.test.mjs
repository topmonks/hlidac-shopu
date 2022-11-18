import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import test from "ava";
import { BlackFridayCategoryID, initialRequests, Label } from "../index.js";

test("empty array without known actor type should return empty array", t => {
  t.deepEqual(initialRequests(null, []), []);
});

test("empty array with BlackFriday should return black friday request", t => {
  const [request] = initialRequests(ActorType.BlackFriday, []);
  t.truthy(request.payload.includes(`"article":${BlackFridayCategoryID}`));
});

test("empty array with BlackFriday should be labeled as Category", t => {
  const [request] = initialRequests(ActorType.BlackFriday, []);
  t.is(request.userData.label, Label.Category);
});

test("empty array with BlackFriday should set categoryId", t => {
  const [request] = initialRequests(ActorType.BlackFriday, []);
  t.is(request.userData.categoryId, BlackFridayCategoryID);
});

