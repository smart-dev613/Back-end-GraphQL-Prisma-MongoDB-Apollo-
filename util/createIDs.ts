import { ObjectId } from 'mongodb';

export const createObjectID = () => {
  let id = new ObjectId().toString();
  let _id = id
  return {
    id,
    _id,
  };
};
