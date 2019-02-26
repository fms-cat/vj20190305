const lerp = ( a: number, b: number, x: number ) => ( a + ( b - a ) * x );

export type MidiCahinEventHandler = ( value: number ) => void;

export interface MidiChainValueOptions {
  smoothFactor?: number;
  listener?: MidiCahinEventHandler;
}

export class MidiChainValue {
  public value: number = 0.0;
  public rawValue: number = 0.0;
  public smoothFactor: number = 1E9;
  public listeners: MidiCahinEventHandler[] = [];

  public update( deltaTime: number ): void {
    this.value = lerp(
      this.rawValue,
      this.value,
      Math.exp( -deltaTime * this.smoothFactor )
    );
  }
}

export class MidiChain {
  public midi: ( key: string, options: MidiChainValueOptions ) => number;
  private __params: { [ key: string ]: MidiChainValue } = {};
  private __learning: string = '';
  private __noteMap: { [ note: number ]: string } = {};
  private __ccMap: { [ cc: number ]: string } = {};
  private __dom?: HTMLElement;
  private __storage: any = JSON.parse( localStorage.midichain || '{}' );

  constructor() {
    navigator.requestMIDIAccess().catch( ( error ) => {
      throw new Error( error );
    } ).then( ( data ) => {
      const inputIter = data.inputs.values();
      for ( let input = inputIter.next(); !input.done; input = inputIter.next() ) {
        const value = input.value;
        value.addEventListener( 'midimessage', this.__onMidiMessage.bind( this ) as EventListener );
      }
    } );

    window.addEventListener( 'wheel', ( event ) => {
      if ( this.__learning && this.__params[ this.__learning ] ) {
        this.__changeValue(
          this.__learning,
          Math.min( Math.max( this.__params[ this.__learning ].rawValue - 0.001 * event.deltaY, 0.0 ), 1.0 )
        );
        this.__updateDOM();
      }
    } );

    this.midi = ( ...args ) => this.__midi( ...args );
  }

  public attachDOM( dom: HTMLElement ) {
    this.__dom = dom;
    this.__updateDOM();
  }

  public learn( key: string ) {
    this.__learning = key;
    this.__updateDOM();
  }

  public update( deltaTime: number = 1.0 / 60.0 ) {
    Object.values( this.__params ).forEach( ( param ) => {
      param.update( deltaTime );
    } );
  }

  private __createParam( key: string ) {
    this.__params[ key ] = new MidiChainValue();
    this.__updateDOM();
  }

  private __updateDOM() {
    const dom = this.__dom;
    if ( !dom ) { return; }

    Object.keys( this.__params ).forEach( ( key ) => {
      let domParam = dom.querySelector( `.${ key }` ) as HTMLDivElement;
      if ( !domParam ) {
        domParam = document.createElement( 'div' ) as HTMLDivElement;
        domParam.className = key;
        domParam.onclick = () => { this.learn( key ); };

        // dict
        const done = Array.from( dom.childNodes ).some( ( _child ) => {
          const child = _child as HTMLDivElement;
          if ( child.className && key < child.className ) {
            dom.insertBefore( domParam, child );
            return true;
          }
          return false;
        } );
        if ( !done ) {
          dom.appendChild( domParam );
        }
      }

      domParam.innerText = `${ key }: ${ this.__params[ key ].rawValue.toFixed( 3 ) }`;
      domParam.style.color = key === this.__learning ? '#0f0' : '';
    } );
  }

  private __changeValue( key: string, value: number ) {
    this.__params[ key ].rawValue = value;
    this.__params[ key ].listeners.forEach(
      ( listener ) => ( listener( this.__params[ key ].rawValue ) )
    );
    this.__storage[ key ] = value;
    localStorage.midichain = JSON.stringify( this.__storage );
  }

  private __onMidiMessage( event: WebMidi.MIDIMessageEvent ) {
    let key = '';
    let value = 0;

    if ( event.data && event.data[ 0 ] === 128 || event.data[ 0 ] === 144 ) {
      if ( this.__learning ) {
        this.__noteMap[ event.data[ 1 ] ] = this.__learning;
        this.__learning = '';
      }

      key = this.__noteMap[ event.data[ 1 ] ];
      value = event.data[ 0 ] === 128 ? 0.0 : event.data[ 2 ] / 127.0;

    } else if ( event.data && event.data[ 0 ] === 176 ) {
      if ( this.__learning ) {
        this.__ccMap[ event.data[ 1 ] ] = this.__learning;
        this.__learning = '';
      }

      key = this.__ccMap[ event.data[ 1 ] ];
      value = event.data[ 2 ] / 127.0;
    }

    if ( key ) {
      this.__changeValue( key, value );
    }

    this.__updateDOM();
  }

  private __midi( key: string, options: MidiChainValueOptions = {} ): number {
    if ( !this.__params[ key ] ) {
      this.__createParam( key );
    }

    if ( options.smoothFactor ) {
      this.__params[ key ].smoothFactor = options.smoothFactor;
    }

    if ( options.listener ) {
      const listeners = this.__params[ key ].listeners;
      if ( listeners.indexOf( options.listener ) === -1 ) {
        listeners.push( options.listener );
      }
    }

    return this.__params[ key ].value;
  }
}
