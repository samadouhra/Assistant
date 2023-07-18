import { Notebook } from "../types";
import { INotebook } from "../types/INotebook";

export const mapINotebookToNotebook = (iNotebook:INotebook):Notebook=>{
    return ({id:iNotebook.documentId,name:iNotebook.title})
}