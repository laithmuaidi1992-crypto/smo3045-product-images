import { Pipe, PipeTransform } from '@angular/core';
import { jod } from '../core/arabic';
@Pipe({ name: 'jod' })
export class JodPipe implements PipeTransform { transform(v: number | null | undefined): string { return jod(Number(v) || 0); } }
